import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { diaBr, dispositivo } from "@/lib/eventos";
import { hashIp } from "@/lib/seguranca";

const COOKIE_VISTOS = "ep_vistos";
const MAX_BODY = 1024;

function origemValida(request: Request): boolean {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  const url = new URL(request.url);

  if (origin) {
    try {
      return new URL(origin).origin === url.origin;
    } catch {
      return false;
    }
  }

  return Boolean(site && (site === "same-origin" || site === "same-site"));
}

export async function POST(request: Request) {
  if (!origemValida(request)) {
    return Response.json({ erro: "Origem inválida." }, { status: 403 });
  }

  const conteudo = await request.text();
  if (conteudo.length > MAX_BODY) {
    return Response.json({ erro: "Corpo da requisição muito grande." }, { status: 413 });
  }

  let rota = "/";
  try {
    const body: unknown = JSON.parse(conteudo || "{}") as unknown;
    if (body && typeof body === "object" && "rota" in body && typeof body.rota === "string") {
      rota = body.rota.slice(0, 300);
    }
  } catch {
    return Response.json({ erro: "Corpo inválido" }, { status: 400 });
  }

  if (!rota.startsWith("/") || rota.startsWith("//") || !(rota === "/" || /^\/produto\/[A-Za-z0-9_-]{1,40}$/.test(rota))) {
    return Response.json({ erro: "Rota inválida" }, { status: 400 });
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip") || "unknown";
  const ipHash = hashIp(ip, "analytics") ?? "";
  const criadoEm = new Date().toISOString();
  const userAgent = request.headers.get("user-agent") ?? "";
  const referrer = request.headers.get("referer") ?? "";
  const c = await db();
  await c.execute({
    sql: "INSERT INTO visitas (rota, ip_hash, user_agent, referrer, criado_em) VALUES (?, ?, ?, ?, ?)",
    args: [rota, ipHash, userAgent.slice(0, 500), referrer.slice(0, 1000), criadoEm],
  });

  const sku = rota.match(/^\/produto\/([A-Za-z0-9_-]{1,40})$/)?.[1];
  if (sku) {
    const jar = await cookies();
    const vistos = (jar.get(COOKIE_VISTOS)?.value ?? "").split(",").filter(Boolean);
    if (!vistos.includes(sku)) {
      const update = await c.execute({
        sql: "UPDATE produtos SET visualizacoes = visualizacoes + 1 WHERE sku_pai = ? AND ativo = 1",
        args: [sku],
      });
      if (update.rowsAffected) {
        await c.execute({
          sql: `INSERT INTO eventos (sku_pai, tipo, ip_hash, criado_em, sku, dispositivo, dia, momento)
                VALUES (?, 'visita', ?, ?, ?, ?, ?, ?)` ,
          args: [sku, ipHash, criadoEm, sku, dispositivo(userAgent), diaBr(), Date.now()],
        });
      }
      jar.set(COOKIE_VISTOS, [...vistos, sku].slice(-50).join(","), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
  }

  return Response.json({ ok: true }, { status: 202 });
}