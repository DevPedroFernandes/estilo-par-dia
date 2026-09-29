import Papa from "papaparse";
import { db, setConfig } from "./db";

/**
 * Importação do produtos_ml_completo.csv.
 * Decisões combinadas com a loja:
 *  - Só Mercado Livre: o CSV no formato Shopee (coluna "SKU Pai") é recusado.
 *  - Sem tamanhos (o CSV do ML não traz).
 *  - Descrições sem as frases que só fazem sentido no ML, com agradecimento no final.
 *  - UPSERT por item_id; produtos ausentes no CSV não são apagados; ativo,
 *    visualizações e cliques de produtos existentes não são alterados.
 */

export const CORES_HEX: Record<string, string> = {
  "#000000": "Preto", "#FFFFFF": "Branco", "#0DA600": "Verde", "#A0522D": "Marrom",
  "#FF8C00": "Laranja", "#9F00FF": "Roxo", "#83DDFF": "Azul Claro", "#FF0000": "Vermelho",
  "#1717FF": "Azul", "#0288D1": "Azul", "#4FC3F7": "Azul Claro", "#D2B48C": "Bege",
  "#6E4B25": "Marrom", "#757575": "Cinza", "#E3B300": "Amarelo", "#6A1B9A": "Roxo",
  "#DD3A82": "Rosa", "#388E3C": "Verde", "#EF6C00": "Laranja", "#B71C1C": "Vermelho",
  "#343F9E": "Azul", "#5D5D5D": "Cinza", "#E5BB00": "Amarelo",
};

const FRASES_ML =
  /(campo de perguntas|ficou com d[uú]vidas|garantia do vendedor|^\s*sem garantia\s*$)/i;
const AGRADECIMENTO = "Obrigado por escolher a Estilo Paródia!";

// pdp_filters=seller_id garante que a página de catálogo (/up/) abra na oferta
// da nossa loja. O resto (tracking_id, position...) é rastreamento da busca.
const PARAMS_ML_PERMITIDOS = new Set(["pdp_filters"]);

// ID da foto no mlstatic (ex.: 621070-MLB117048459849). A mesma foto vem em
// vários tamanhos; o ID serve para tirar repetições e descartar ícones do ML.
const RE_ID_FOTO = /(\d+-MLB\d+)/;

export type Cor = { nome: string; hex: string };

export function semAcento(t: string): string {
  return (t || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function texto(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

/** Aceita 86, "86.0", "86,00", "R$ 1.234,56". */
export function normalizarPreco(v: unknown): number {
  let s = texto(v).replace(/[^\d,.\-]/g, "");
  if (!s) return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/** "#000000, #A0522D" -> [{nome:"Preto",hex:"#000000"}, ...] sem nomes repetidos. */
export function normalizarCores(v: unknown): Cor[] {
  const cores: Cor[] = [];
  const vistos = new Set<string>();
  for (const m of texto(v).matchAll(/#[0-9A-Fa-f]{6}/g)) {
    const hex = m[0].toUpperCase();
    const nome = CORES_HEX[hex] ?? hex;
    if (!vistos.has(nome)) {
      vistos.add(nome);
      cores.push({ nome, hex });
    }
  }
  return cores;
}

function prioridadeImagem(url: string): number {
  if (url.includes("D_NQ_NP_") && url.includes("-O")) return 0; // original grande
  if (url.includes("-2X")) return 1;
  if (url.includes("-F")) return 2;
  return 3;
}

/** Imagem principal + galeria, uma URL por foto, na ordem em que aparecem. */
export function normalizarImagens(principal: string, lista: unknown): string[] {
  const urls = [principal, ...texto(lista).split("|").map((u) => u.trim())];
  const melhores = new Map<string, string>();
  for (const url of urls) {
    if (!url.startsWith("http")) continue;
    const id = url.match(RE_ID_FOTO)?.[1];
    if (!id) continue; // ícones e logos da página do ML
    const atual = melhores.get(id);
    if (!atual || prioridadeImagem(url) < prioridadeImagem(atual)) melhores.set(id, url);
  }
  return [...melhores.values()];
}

export function limparLinkMl(url: unknown): string {
  const s = texto(url);
  if (!s) return "";
  try {
    const u = new URL(s);
    for (const k of [...u.searchParams.keys()]) {
      if (!PARAMS_ML_PERMITIDOS.has(k)) u.searchParams.delete(k);
    }
    u.hash = "";
    return u.toString();
  } catch {
    return "";
  }
}

export function nomeEstampa(titulo: string): string {
  const partes = titulo.split(/Estilo Par[óo]dia/i);
  return partes.length > 1 && partes[1].trim() ? partes[1].trim() : titulo;
}

export function limparDescricao(descricao: unknown, titulo: string, categoria: string): string {
  const linhas = texto(descricao)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => !FRASES_ML.test(l));
  let corpo = linhas.join("\n").replaceAll(AGRADECIMENTO, "");
  corpo = corpo.replace(/\n\s*\n\s*(\n\s*)+/g, "\n\n").trim();

  if (!corpo) {
    const peca = categoria.toLowerCase().includes("vestido") ? "Vestido" : "Camiseta";
    corpo =
      `${peca} Estilo Paródia com a estampa ${nomeEstampa(titulo)}. Malha leve e confortável, ` +
      `pensada para o dia a dia, com uma estampa que transforma um clássico em algo ` +
      `divertido e cheio de personalidade.`;
  }
  return `${corpo}\n\n${AGRADECIMENTO}`;
}

export function agoraIso(): string {
  // Horário de Brasília (sem horário de verão desde 2019).
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 19) + "-03:00";
}

const COLUNAS_ML = ["item_id", "titulo", "preco", "link", "imagem"];

type Linha = Record<string, string>;

/** Importa o conteúdo de um CSV. Devolve quantos produtos são novos e quantos foram atualizados. */
export async function importarCsv(
  conteudo: string,
): Promise<{ novos: number; atualizados: number; mantidos: number }> {
  const { data, meta } = Papa.parse<Linha>(conteudo.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const colunas = meta.fields ?? [];

  if (colunas.includes("SKU Pai")) {
    throw new Error(
      "Este é o CSV no formato Shopee. Por enquanto o catálogo usa só o produtos_ml_completo.csv (Mercado Livre).",
    );
  }
  const faltando = COLUNAS_ML.filter((c) => !colunas.includes(c));
  if (faltando.length) throw new Error(`CSV sem as colunas obrigatórias: ${faltando.join(", ")}`);

  // Consolida por item_id: se repetir, a última linha vence.
  const produtos = new Map<string, (string | number)[]>();
  data.forEach((l, posicao) => {
    const sku = texto(l.item_id);
    const titulo = texto(l.titulo) || texto(l.titulo_pdp);
    if (!sku || !titulo) return;
    const categoria = texto(l.categoria_shopee) || "Outros";
    const imagens = normalizarImagens(texto(l.imagem), l.imagens);
    const qtd = Number.parseInt(texto(l.qtd_variacoes), 10);
    produtos.set(sku, [
      sku,
      titulo,
      categoria,
      normalizarPreco(texto(l.preco) || l.preco_texto),
      JSON.stringify(normalizarCores(l.cores)),
      Number.isFinite(qtd) ? qtd : 0,
      limparLinkMl(l.link),
      imagens[0] ?? texto(l.imagem),
      JSON.stringify(imagens),
      limparDescricao(l.descricao, titulo, categoria),
      semAcento(`${titulo} ${categoria}`),
      posicao,
    ]);
  });
  if (!produtos.size) throw new Error("Nenhum produto válido encontrado no CSV.");

  const c = await db();
  const linhasExistentes = (await c.execute("SELECT sku_pai, protegido FROM produtos")).rows;
  const existentes = new Set(linhasExistentes.map((r) => r.sku_pai as string));
  // Produtos editados no painel não são sobrescritos pelo CSV.
  const protegidos = new Set(
    linhasExistentes.filter((r) => Number(r.protegido) === 1).map((r) => r.sku_pai as string),
  );
  const momento = agoraIso();

  // Tudo numa transação: ou importa tudo, ou nada.
  await c.batch(
    [...produtos.values()].map((args) => ({
      sql: `INSERT INTO produtos (sku_pai, titulo, categoria, preco, cores, qtd_variacoes,
              link_ml, imagem, imagens, descricao, busca, ordem_csv, criado_em, atualizado_em)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(sku_pai) DO UPDATE SET
              titulo = excluded.titulo, categoria = excluded.categoria, preco = excluded.preco,
              cores = excluded.cores, qtd_variacoes = excluded.qtd_variacoes,
              link_ml = excluded.link_ml, imagem = excluded.imagem, imagens = excluded.imagens,
              descricao = excluded.descricao, busca = excluded.busca,
              ordem_csv = excluded.ordem_csv, atualizado_em = excluded.atualizado_em
            WHERE produtos.protegido = 0`,
      args: [...args, momento, momento],
    })),
    "write",
  );
  await setConfig("ultima_atualizacao", momento);

  const novos = [...produtos.keys()].filter((k) => !existentes.has(k)).length;
  const mantidos = [...produtos.keys()].filter((k) => protegidos.has(k)).length;
  return { novos, atualizados: produtos.size - novos - mantidos, mantidos };
}
