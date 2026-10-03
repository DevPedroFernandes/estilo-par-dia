import { createHmac } from "node:crypto";
import { db } from "./db";

const LIMITE = 5;
const JANELA_MS = 5 * 60 * 1000;

function chaveRateLimit(ip: string): string {
  const segredo = process.env.IP_HASH_SECRET || process.env.AUTH_SECRET || process.env.SECRET_KEY || process.env.ADMIN_SENHA || "local-rate-limit";
  return createHmac("sha256", segredo).update(ip).digest("hex");
}

/** Atomically records an attempt and permits at most five within the window. */
export async function permitirTentativaLogin(ip: string): Promise<boolean> {
  const c = await db();
  const identificador = chaveRateLimit(ip);
  const agora = Date.now();
  const limite = agora - JANELA_MS;
  const resultados = await c.batch([
    { sql: "DELETE FROM login_falhas WHERE momento < ?", args: [limite] },
    {
      sql: `INSERT INTO login_falhas (ip, momento)
            SELECT ?, ?
            WHERE (SELECT COUNT(*) FROM login_falhas WHERE ip = ? AND momento >= ?) < ?`,
      args: [identificador, agora, identificador, limite, LIMITE],
    },
  ], "write");
  return Number(resultados[1]?.rowsAffected ?? 0) === 1;
}

export async function limparFalhas(ip: string): Promise<void> {
  const c = await db();
  await c.execute({ sql: "DELETE FROM login_falhas WHERE ip = ?", args: [chaveRateLimit(ip)] });
}