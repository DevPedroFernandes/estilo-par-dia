"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  credenciaisConferem,
  criarSessao,
  encerrarSessao,
  estaLogado,
  ipCliente,
  senhaPadraoEmProducao,
} from "@/lib/auth";
import { agoraIso, importarCsv } from "@/lib/importar";
import { db, getConfig, setConfig } from "@/lib/db";
import { limparFalhas, permitirTentativaLogin } from "@/lib/rate-limit";

/**
 * Ações do painel (Server Actions). O Next.js recusa Server Actions vindas de
 * outro domínio (checa o Origin), o que protege contra CSRF.
 * Toda ação, exceto o login, confere a sessão antes de fazer qualquer coisa.
 */

export type RelatorioImportacao = { criados: number; atualizados: number; erros: number };
export type Resultado = { tipo: "ok" | "erro"; msg: string; relatorio?: RelatorioImportacao } | null;

const TAMANHO_MAX = 4 * 1024 * 1024; // 4 MB (limite da Vercel é 4,5 MB por requisição)

function resumo(novos: number, atualizados: number, mantidos: number, erros: number, detalhes: string[]): string {
  const extra = mantidos ? `, ${mantidos} mantidos (editados no painel)` : "";
  const falhas = erros ? `, ${erros} erros: ${detalhes.slice(0, 3).join("; ")}` : "";
  return `${novos} criados, ${atualizados} atualizados${extra}${falhas}.`;
}

async function exigirSessao(): Promise<void> {
  if (!(await estaLogado())) redirect("/admin");
}

export async function entrar(_anterior: Resultado, form: FormData): Promise<Resultado> {
  if (senhaPadraoEmProducao()) {
    return {
      tipo: "erro",
      msg: "Painel bloqueado: defina ADMIN_USER e ADMIN_SENHA nas variáveis de ambiente da Vercel e faça um novo deploy.",
    };
  }
  const ip = await ipCliente();
  if (!(await permitirTentativaLogin(ip))) {
    return { tipo: "erro", msg: "Muitas tentativas. Aguarde 5 minutos e tente de novo." };
  }
  const usuario = String(form.get("usuario") ?? "");
  const senha = String(form.get("senha") ?? "");

  if (!credenciaisConferem(usuario, senha)) {
    return { tipo: "erro", msg: "Usuário ou senha inválidos." };
  }
  await limparFalhas(ip);
  await criarSessao();
  redirect("/admin/painel");
}

export async function sair(): Promise<void> {
  await encerrarSessao();
  redirect("/");
}

export async function enviarCsv(_anterior: Resultado, form: FormData): Promise<Resultado> {
  await exigirSessao();
  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File) || !arquivo.size) return { tipo: "erro", msg: "Escolha um arquivo CSV." };

  // Nome do arquivo só é usado para exibição; reduzimos a caracteres seguros.
  const nome = arquivo.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-100);
  if (!nome.toLowerCase().endsWith(".csv")) return { tipo: "erro", msg: "Só são aceitos arquivos .csv." };
  if (arquivo.size > TAMANHO_MAX) return { tipo: "erro", msg: "Arquivo maior que 4 MB." };

  const conteudo = await arquivo.text();
  try {
    const { criados, novos, atualizados, mantidos, erros, detalhesErros } = await importarCsv(conteudo);
    // Guarda o CSV no banco para o botão "Recarregar" (na Vercel não existe pasta uploads/).
    await setConfig("ultimo_csv", conteudo);
    await setConfig("ultimo_csv_nome", `${nome} (${agoraIso().slice(0, 16).replace("T", " ")})`);
    revalidatePath("/", "layout");
    return {
      tipo: "ok",
      msg: `CSV importado: ${resumo(novos, atualizados, mantidos, erros, detalhesErros)}`,
      relatorio: { criados, atualizados, erros },
    };
  } catch (e) {
    return { tipo: "erro", msg: `Não foi possível importar: ${(e as Error).message}` };
  }
}

export async function recarregar(_anterior: Resultado): Promise<Resultado> {
  await exigirSessao();
  const conteudo = await getConfig("ultimo_csv");
  if (!conteudo) return { tipo: "erro", msg: "Nenhum CSV enviado ainda." };
  try {
    const { criados, novos, atualizados, mantidos, erros, detalhesErros } = await importarCsv(conteudo);
    revalidatePath("/", "layout");
    return {
      tipo: "ok",
      msg: `Recarregado: ${resumo(novos, atualizados, mantidos, erros, detalhesErros)}`,
      relatorio: { criados, atualizados, erros },
    };
  } catch (e) {
    return { tipo: "erro", msg: `Não foi possível recarregar: ${(e as Error).message}` };
  }
}

export async function alternarAtivo(form: FormData): Promise<void> {
  await exigirSessao();
  const sku = String(form.get("sku") ?? "");
  const c = await db();
  await c.execute({
    sql: "UPDATE produtos SET ativo = 1 - ativo, atualizado_em = ? WHERE sku_pai = ?",
    args: [agoraIso(), sku],
  });
  revalidatePath("/", "layout");
}
