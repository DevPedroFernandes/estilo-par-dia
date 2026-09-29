"use server";

import { cookies, headers } from "next/headers";
import { db } from "./db";
import { registrarEvento } from "./eventos";
import { semAcento } from "./importar";

const COOKIE_VISTOS = "ep_vistos";
const COOKIE_BUSCA = "ep_busca";

const opcoesCookie = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

/**
 * Conta uma visualização por produto por visitante (cookie com os últimos 50
 * produtos vistos), para um F5 não inflar o "Mais acessados". É chamada pelo
 * navegador depois que a página abre, então robôs que não rodam JavaScript não contam.
 */
export async function registrarVisita(sku: string): Promise<void> {
  if (typeof sku !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(sku)) return;
  const jar = await cookies();
  const vistos = (jar.get(COOKIE_VISTOS)?.value ?? "").split(",").filter(Boolean);
  if (vistos.includes(sku)) return;

  const c = await db();
  const r = await c.execute({
    sql: "UPDATE produtos SET visualizacoes = visualizacoes + 1 WHERE sku_pai = ? AND ativo = 1",
    args: [sku],
  });
  if (!r.rowsAffected) return;

  await registrarEvento({ tipo: "visita", sku, userAgent: (await headers()).get("user-agent") });
  jar.set(COOKIE_VISTOS, [...vistos, sku].slice(-50).join(","), opcoesCookie(60 * 60 * 24 * 30));
}

/**
 * Registra uma busca feita na vitrine (termo + quantos produtos achou).
 * O mesmo termo seguido (ex.: trocar a ordenação) conta uma vez só.
 */
export async function registrarBusca(termo: string, resultados: number): Promise<void> {
  if (typeof termo !== "string") return;
  const limpo = semAcento(termo).replace(/\s+/g, " ").trim().slice(0, 60);
  if (!limpo || !Number.isFinite(resultados)) return;
  const jar = await cookies();
  if (jar.get(COOKIE_BUSCA)?.value === encodeURIComponent(limpo)) return;

  await registrarEvento({
    tipo: "busca",
    termo: limpo,
    resultados: Math.max(0, Math.floor(resultados)),
    userAgent: (await headers()).get("user-agent"),
  });
  jar.set(COOKIE_BUSCA, encodeURIComponent(limpo), opcoesCookie(60 * 30));
}
