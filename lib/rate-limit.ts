import { db } from "./db";
import { hashIp } from "./seguranca";

const LIMITE = 5;
const JANELA_MS = 5 * 60 * 1000;

function chaveRateLimit(ip: string): string | null {
  return hashIp(ip, "login");
}

/** Atomically records an attempt and permits at most five within the window. */
export async function permitirTentativaLogin(ip: string): Promise<boolean> {
  const identificador = chaveRateLimit(ip);
  if (!identificador) return false;

  const c = await db();
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
  const identificador = chaveRateLimit(ip);
  if (!identificador) return;

  const c = await db();
  await c.execute({ sql: "DELETE FROM login_falhas WHERE ip = ?", args: [identificador] });
}