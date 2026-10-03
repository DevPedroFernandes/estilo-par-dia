import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { diaBr, dispositivo } from "@/lib/eventos";

type Destino = "ml" | "shopee";

function hostPermitido(url: string, destino: Destino): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return destino === "ml"
      ? host === "mercadolivre.com.br" || host.endsWith(".mercadolivre.com.br")
      : host === "shopee.com.br" || host.endsWith(".shopee.com.br");
  } catch {
    return false;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sku: string; destino: string }> },
) {
  const { sku, destino: destinoBruto } = await params;
  if (destinoBruto !== "ml" && destinoBruto !== "shopee") {
    return new Response("Destino inválido", { status: 404 });
  }
  const destino: Destino = destinoBruto;
  const column = destino === "ml" ? "link_ml" : "link_shopee";
  const c = await db();
  const result = await c.execute({
    sql: `SELECT ${column} AS link FROM produtos WHERE sku_pai = ? AND ativo = 1`,
    args: [sku],
  });
  const link = String(result.rows[0]?.link ?? "");

  if (!result.rows[0] || !hostPermitido(link, destino)) {
    return NextResponse.redirect(new URL(`/produto/${encodeURIComponent(sku)}?aviso=sem-link`, request.url), 302);
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  const segredo = process.env.IP_HASH_SECRET || process.env.AUTH_SECRET || process.env.SECRET_KEY || "";
  const ipHash = createHash("sha256").update(`${segredo}:${ip}`).digest("hex");
  const criadoEm = new Date().toISOString();
  const tipo = destino === "ml" ? "clique_ml" : "clique_shopee";
  await c.execute({
    sql: `INSERT INTO eventos (sku_pai, tipo, ip_hash, criado_em, sku, dia, momento, dispositivo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [sku, tipo, ipHash, criadoEm, sku, diaBr(), Date.now(), dispositivo(request.headers.get("user-agent"))],
  });
  if (destino === "ml") {
    await c.execute({ sql: "UPDATE produtos SET cliques_ml = cliques_ml + 1 WHERE sku_pai = ?", args: [sku] });
  }

  return NextResponse.redirect(link, 302);
}