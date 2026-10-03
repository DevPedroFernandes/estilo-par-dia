import { connection } from "next/server";
import { db } from "./db";
import { semAcento, type Cor } from "./importar";

export type Produto = {
  sku_pai: string;
  titulo: string;
  categoria: string;
  preco: number;
  cores: Cor[];
  tamanhos: string[];
  qtd_variacoes: number;
  link_ml: string;
  link_shopee: string | null;
  imagem: string;
  imagens: string[];
  descricao: string;
};

export const ORDENACOES = {
  populares: { rotulo: "Mais acessados", sql: "(visualizacoes + cliques_ml) DESC, ordem_csv ASC" },
  menor: { rotulo: "Menor preço", sql: "preco ASC, ordem_csv ASC" },
  maior: { rotulo: "Maior preço", sql: "preco DESC, ordem_csv ASC" },
  az: { rotulo: "A–Z", sql: "titulo COLLATE NOCASE ASC" },
} as const;
export type Ordem = keyof typeof ORDENACOES;

function paraProduto(r: Record<string, unknown>): Produto {
  const imagens = JSON.parse((r.imagens as string) || "[]") as string[];
  return {
    sku_pai: r.sku_pai as string,
    titulo: r.titulo as string,
    categoria: r.categoria as string,
    preco: Number(r.preco),
    cores: JSON.parse((r.cores as string) || "[]"),
    tamanhos: JSON.parse((r.tamanhos as string) || "[]"),
    qtd_variacoes: Number(r.qtd_variacoes),
    link_ml: r.link_ml as string,
    link_shopee: (r.link_shopee as string | null) ?? null,
    imagem: r.imagem as string,
    imagens: imagens.length ? imagens : r.imagem ? [r.imagem as string] : [],
    descricao: r.descricao as string,
  };
}

export function categoriaParaChip(categoria: string): string {
  const valor = (categoria ?? "").trim();
  if (!valor) return "Outros";
  const normal = valor.toLowerCase();
  if (normal.includes("vestido")) return "Vestidos";
  if (normal.includes("camiseta") || normal.includes("regata") || normal.includes("camisetão")) return "Camisetas";
  return valor;
}

export async function listarProdutos(q: string, cat: string, ordem: Ordem): Promise<Produto[]> {
  await connection();
  let sql = "SELECT * FROM produtos WHERE ativo = 1";
  const args: string[] = [];
  for (const termo of semAcento(q).split(/\s+/).filter(Boolean)) {
    sql += " AND busca LIKE ? ESCAPE '\\'";
    args.push(`%${termo.replace(/[\\%_]/g, (c) => "\\" + c)}%`);
  }
  if (cat) {
    const chip = categoriaParaChip(cat);
    if (chip === "Camisetas") {
      sql += " AND (categoria = ? OR categoria LIKE ? OR categoria LIKE ? OR categoria LIKE ?)";
      args.push("Camisetas", "%Camisetas%", "%Regatas%", "%Camisetões%") ;
    } else if (chip === "Vestidos") {
      sql += " AND categoria LIKE ?";
      args.push("%Vestido%");
    } else {
      sql += " AND categoria = ?";
      args.push(cat);
    }
  }
  sql += " ORDER BY " + ORDENACOES[ordem].sql;
  const c = await db();
  return (await c.execute({ sql, args })).rows.map((r) => paraProduto(r as Record<string, unknown>));
}

export async function listarCategorias(): Promise<string[]> {
  await connection();
  const c = await db();
  const r = await c.execute("SELECT DISTINCT categoria FROM produtos WHERE ativo = 1 AND categoria <> '' ORDER BY categoria");
  const chips = new Set<string>();
  for (const row of r.rows) {
    const categoria = String(row.categoria ?? "").trim();
    if (!categoria) continue;
    chips.add(categoriaParaChip(categoria));
  }
  const principais = ["Camisetas", "Vestidos"];
  const demais = [...chips].filter((categoria) => !principais.includes(categoria)).sort((a, b) => a.localeCompare(b));
  return [...principais, ...demais].filter((categoria, index, arr) => arr.indexOf(categoria) === index);
}

export async function buscarProduto(sku: string): Promise<Produto | null> {
  await connection();
  const c = await db();
  const r = await c.execute({ sql: "SELECT * FROM produtos WHERE sku_pai = ? AND ativo = 1", args: [sku] });
  return r.rows[0] ? paraProduto(r.rows[0] as Record<string, unknown>) : null;
}

export function formatarBrl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Todas as categorias (inclusive de produtos inativos), para o formulário do painel. */
export async function listarTodasCategorias(): Promise<string[]> {
  await connection();
  const c = await db();
  const r = await c.execute("SELECT DISTINCT categoria FROM produtos WHERE categoria <> '' ORDER BY categoria");
  return r.rows.map((x) => x.categoria as string);
}

export type Destaque = {
  sku_pai: string;
  titulo: string;
  estampa: string;
  categoria: string;
  preco: number;
  imagem: string;
  titulo_banner: string;
  subtitulo_banner: string;
};

/**
 * Frases do banner (usadas em rodízio). A frase própria do produto, se houver,
 * substitui só o título; o subtítulo continua vindo daqui.
 */
const COPY_BANNER = [
  ["Clássicos com outra cara.", "Arte, música e cultura pop reinterpretadas em estampas que puxam conversa."],
  ["Vista uma boa referência.", "Estampas exclusivas para quem tem repertório e gosta de mostrar."],
  ["Conforto que não passa despercebido.", "Malha fria, caimento leve e uma estampa que chama atenção por onde você passa."],
  ["A peça que faltava no seu estilo.", "Criações originais e bem-humoradas, feitas para o dia a dia."],
  ["Humor que se veste bem.", "Uma piscadela para os ícones que você ama, em uma peça confortável de verdade."],
] as const;

const MAX_DESTAQUES = 6;

/** Produtos do banner: os marcados no painel ou, se nenhum, os 4 mais acessados. */
export async function listarDestaques(): Promise<Destaque[]> {
  await connection();
  const c = await db();
  let r = await c.execute({
    sql: `SELECT * FROM produtos WHERE ativo = 1 AND destaque = 1 ORDER BY ordem_csv ASC LIMIT ?`,
    args: [MAX_DESTAQUES],
  });
  if (!r.rows.length) {
    r = await c.execute(
      `SELECT * FROM produtos WHERE ativo = 1 AND imagem <> ''
       ORDER BY (visualizacoes + cliques_ml) DESC, ordem_csv ASC LIMIT 4`,
    );
  }
  return r.rows.map((row, i) => {
    const titulo = row.titulo as string;
    const partes = titulo.split(/Estilo Par[óo]dia/i);
    const [tituloPadrao, sub] = COPY_BANNER[i % COPY_BANNER.length];
    return {
      sku_pai: row.sku_pai as string,
      titulo,
      estampa: partes.length > 1 && partes[1].trim() ? partes[1].trim() : titulo,
      categoria: row.categoria as string,
      preco: Number(row.preco),
      imagem: row.imagem as string,
      titulo_banner: ((row.frase_destaque as string) || "").trim() || tituloPadrao,
      subtitulo_banner: sub,
    };
  });
}
