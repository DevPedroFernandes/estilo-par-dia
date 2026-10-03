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
  tipo: "visita" | "clique" | "clique_ml" | "clique_shopee" | "busca";
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
    const criadoEm = new Date(agora).toISOString();
    await c.execute({
      sql: `INSERT INTO eventos (sku_pai, tipo, criado_em, sku, termo, resultados, dispositivo, dia, momento)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        e.sku ?? "",
        e.tipo,
        criadoEm,
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
