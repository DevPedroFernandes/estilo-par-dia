import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { registrarEvento } from "@/lib/eventos";

/** Conta o clique e redireciona (302) para o anúncio no Mercado Livre. */
export async function GET(req: Request, { params }: { params: Promise<{ sku: string }> }) {
  const { sku } = await params;
  const c = await db();
  const r = await c.execute({ sql: "SELECT link_ml FROM produtos WHERE sku_pai = ? AND ativo = 1", args: [sku] });
  if (!r.rows[0]) return new Response("Produto não encontrado", { status: 404 });

  const link = (r.rows[0].link_ml as string) || "";
  let host = "";
  try {
    host = new URL(link).hostname;
  } catch {}
  // Só redireciona para o ML, para a rota não virar um redirecionamento aberto.
  if (!(host === "mercadolivre.com.br" || host.endsWith(".mercadolivre.com.br"))) {
    return NextResponse.redirect(new URL(`/produto/${encodeURIComponent(sku)}?aviso=sem-link`, req.url), 302);
  }
  await c.execute({ sql: "UPDATE produtos SET cliques_ml = cliques_ml + 1 WHERE sku_pai = ?", args: [sku] });
  await registrarEvento({ tipo: "clique", sku, userAgent: req.headers.get("user-agent") });
  return NextResponse.redirect(link, 302);
}
