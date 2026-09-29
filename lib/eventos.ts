import { db } from "./db";

/** Data de hoje (ou de um instante) no horário de Brasília, como AAAA-MM-DD. */
export function diaBr(ms: number = Date.now()): string {
  return new Date(ms - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Classifica o aparelho pelo user-agent. Só guardamos "celular" ou "computador". */
export function dispositivo(userAgent: string | null): string {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent ?? "") ? "celular" : "computador";
}

type Evento = {
  tipo: "visita" | "clique" | "busca";
  sku?: string;
  termo?: string;
  resultados?: number;
  userAgent?: string | null;
};

/** Grava um evento para o dashboard. Falhas aqui nunca derrubam a página. */
export async function registrarEvento(e: Evento): Promise<void> {
  try {
    const c = await db();
    const agora = Date.now();
    await c.execute({
      sql: `INSERT INTO eventos (tipo, sku, termo, resultados, dispositivo, dia, momento)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        e.tipo,
        e.sku ?? null,
        e.termo ?? null,
        e.resultados ?? null,
        dispositivo(e.userAgent ?? null),
        diaBr(agora),
        agora,
      ],
    });
  } catch (erro) {
    console.error("Falha ao registrar evento:", erro);
  }
}
