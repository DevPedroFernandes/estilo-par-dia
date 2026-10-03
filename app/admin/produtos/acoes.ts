"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { estaLogado } from "@/lib/auth";
import { db } from "@/lib/db";
import { agoraIso, limparDescricao, normalizarPreco, semAcento, type Cor } from "@/lib/importar";
import { normalizarNomeCor, normalizarTamanho } from "@/lib/variantes";

/**
 * Cadastro manual de produtos (criar, editar, excluir).
 * Produtos editados aqui ficam "protegidos": a importação do CSV não sobrescreve
 * (a não ser que a opção seja desmarcada no formulário).
 */

export type Valores = {
  titulo: string;
  categoria: string;
  preco: string;
  link_ml: string;
  cores: Cor[];
  tamanhos: string[];
  imagens: string;
  descricao: string;
  ativo: boolean;
  protegido: boolean;
  destaque: boolean;
  frase_destaque: string;
};

export type EstadoForm = { erro: string; valores: Valores } | null;

async function exigirSessao(): Promise<void> {
  if (!(await estaLogado())) redirect("/admin");
}

function hostMl(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === "mercadolivre.com.br" || h.endsWith(".mercadolivre.com.br");
  } catch {
    return false;
  }
}

/**
 * Código do produto: o ID do anúncio (MLB...) quando o link traz um, para o
 * CSV conseguir reconhecer o mesmo produto depois; senão, um código "MAN...".
 */
function gerarSku(link: string): string {
  const m = link.match(/\bMLB-?(\d{6,})/);
  if (m) return `MLB${m[1]}`;
  return `MAN${Date.now().toString(36).toUpperCase()}`;
}

function lerForm(form: FormData): Valores {
  const lerJson = (campo: string): unknown => {
    try {
      return JSON.parse(String(form.get(campo) ?? "[]"));
    } catch {
      return [];
    }
  };
  const cores = lerJson("cores");
  const tamanhos = lerJson("tamanhos");
  const coresNormalizadas = Array.isArray(cores)
    ? cores.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const cor = item as Partial<Cor>;
        return [{
          nome: normalizarNomeCor(String(cor.nome ?? "")),
          hex: String(cor.hex ?? "").toUpperCase(),
        }];
      })
    : [];
  const tamanhosNormalizados = Array.isArray(tamanhos)
    ? [...new Set(tamanhos.map(String).map(normalizarTamanho).filter(Boolean))]
    : [];
  return {
    titulo: String(form.get("titulo") ?? "").trim(),
    categoria: String(form.get("categoria") ?? "").trim(),
    preco: String(form.get("preco") ?? "").trim(),
    link_ml: String(form.get("link_ml") ?? "").trim(),
    cores: coresNormalizadas,
    tamanhos: tamanhosNormalizados,
    imagens: String(form.get("imagens") ?? "").trim(),
    descricao: String(form.get("descricao") ?? "").trim(),
    ativo: form.get("ativo") === "on",
    protegido: form.get("protegido") === "on",
    destaque: form.get("destaque") === "on",
    frase_destaque: String(form.get("frase_destaque") ?? "").trim(),
  };
}

function validar(v: Valores): string | null {
  if (v.titulo.length < 3 || v.titulo.length > 150) return "O título precisa ter entre 3 e 150 caracteres.";
  if (!v.categoria || v.categoria.length > 60) return "Informe a categoria.";
  if (normalizarPreco(v.preco) <= 0) return "Informe um preço válido (ex.: 89,90).";
  if (v.cores.length > 20 || v.cores.some((c) => !c.nome.trim() || !/^#[0-9A-Fa-f]{6}$/.test(c.hex))) {
    return "Revise as cores: informe um nome e uma cor hexadecimal válida.";
  }
  if (v.tamanhos.length > 20 || v.tamanhos.some((t) => t.length > 20)) return "Informe até 20 tamanhos, com no máximo 20 caracteres cada.";
  if (!hostMl(v.link_ml)) return "O link precisa ser de um anúncio do Mercado Livre (mercadolivre.com.br).";
  const urls = v.imagens.split(/\s+/).filter(Boolean);
  if (!urls.length) return "Coloque pelo menos o link de uma foto.";
  if (urls.length > 12) return "Use no máximo 12 fotos.";
  if (urls.some((u) => !/^https:\/\/\S+$/i.test(u))) return "Cada foto precisa ser um link começando com https://";
  if (v.frase_destaque.length > 60) return "A frase do banner pode ter no máximo 60 caracteres.";
  return null;
}

export async function salvarProduto(_anterior: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirSessao();
  const v = lerForm(form);
  const skuOriginal = String(form.get("sku_original") ?? "");
  const erro = validar(v);
  if (erro) return { erro, valores: v };

  const imagens = [...new Set(v.imagens.split(/\s+/).filter(Boolean))];
  const dados = [
    v.titulo,
    v.categoria,
    normalizarPreco(v.preco),
    JSON.stringify(v.cores),
    JSON.stringify([...new Set(v.tamanhos)]),
    v.link_ml,
    imagens[0],
    imagens[0],
    JSON.stringify(imagens),
    limparDescricao(v.descricao, v.titulo, v.categoria),
    semAcento(`${v.titulo} ${v.categoria}`),
    v.ativo ? 1 : 0,
    v.destaque ? 1 : 0,
    v.frase_destaque,
  ];
  const c = await db();
  const agora = agoraIso();

  if (skuOriginal) {
    const r = await c.execute({
            sql: `UPDATE produtos SET titulo = ?, categoria = ?, preco = ?, cores = ?, tamanhos = ?,
              link_ml = ?, imagem = ?, imagem_principal = ?, imagens = ?, descricao = ?, busca = ?, ativo = ?,
              destaque = ?, frase_destaque = ?, protegido = ?, atualizado_em = ?
            WHERE sku_pai = ?`,
      args: [...dados, v.protegido ? 1 : 0, agora, skuOriginal],
    });
    if (!r.rowsAffected) return { erro: "Produto não encontrado.", valores: v };
  } else {
    const sku = gerarSku(v.link_ml);
    const existe = await c.execute({ sql: "SELECT 1 FROM produtos WHERE sku_pai = ?", args: [sku] });
    if (existe.rows.length) {
      return { erro: `Já existe um produto com o código ${sku} (mesmo anúncio do ML).`, valores: v };
    }
    // Produto novo entra no topo da ordem "padrão" (ordem_csv negativo).
    await c.execute({
      sql: `INSERT INTO produtos (titulo, categoria, preco, cores, tamanhos, link_ml, imagem, imagem_principal,
              imagens, descricao, busca, ativo, destaque, frase_destaque, sku_pai, origem, protegido,
              ordem_csv, criado_em, atualizado_em)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', 1,
              (SELECT COALESCE(MIN(ordem_csv), 0) - 1 FROM produtos), ?, ?)`,
      args: [...dados, sku, agora, agora],
    });
  }
  revalidatePath("/", "layout");
  redirect(`/admin/produtos?ok=${skuOriginal ? "editado" : "criado"}`);
}

export async function excluirProduto(form: FormData): Promise<void> {
  await exigirSessao();
  const sku = String(form.get("sku") ?? "");
  const c = await db();
  await c.execute({ sql: "DELETE FROM produtos WHERE sku_pai = ?", args: [sku] });
  revalidatePath("/", "layout");
  redirect("/admin/produtos?ok=excluido");
}
