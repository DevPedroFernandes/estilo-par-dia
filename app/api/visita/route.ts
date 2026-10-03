import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { diaBr, dispositivo } from "@/lib/eventos";

const COOKIE_VISTOS = "ep_vistos";

export async function POST(request: Request) {
  let rota = "/";
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && "rota" in body && typeof body.rota === "string") {
      rota = body.rota.slice(0, 300);
    }
  } catch {
    return Response.json({ erro: "Corpo inválido" }, { status: 400 });
  }
  if (!rota.startsWith("/") || rota.startsWith("//")) {
    return Response.json({ erro: "Rota inválida" }, { status: 400 });
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  const segredo = process.env.IP_HASH_SECRET || process.env.AUTH_SECRET || process.env.SECRET_KEY || "";
  const ipHash = createHash("sha256").update(`${segredo}:${ip}`).digest("hex");
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
                VALUES (?, 'visita', ?, ?, ?, ?, ?, ?)`,
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