import { db } from "./db";
import { diaBr } from "./eventos";

/** Números do dashboard, calculados a partir da tabela de eventos. */

export type Periodo = 7 | 30 | 90;

export type Metricas = {
  dias: string[];
  visitasPorDia: number[];
  cliquesPorDia: number[];
  kpis: {
    visitas: { atual: number; anterior: number };
    cliques: { atual: number; anterior: number };
    taxa: { atual: number; anterior: number }; // cliques / visitas
    buscas: { atual: number; anterior: number };
  };
  topProdutos: { sku: string; titulo: string; visitas: number; cliques: number }[];
  categorias: { categoria: string; visitas: number; cliques: number }[];
  dispositivos: { celular: number; computador: number };
  buscas: { termo: string; vezes: number }[];
  buscasSemResultado: { termo: string; vezes: number }[];
  semVisita: number;
  ativos: number;
  primeiroEvento: string | null;
};

const DIA_MS = 24 * 60 * 60 * 1000;

function listaDias(qtd: number, fimMs: number): string[] {
  return Array.from({ length: qtd }, (_, i) => diaBr(fimMs - (qtd - 1 - i) * DIA_MS));
}

export async function calcularMetricas(periodo: Periodo): Promise<Metricas> {
  const c = await db();
  const agora = Date.now();
  const dias = listaDias(periodo, agora);
  const inicio = dias[0];
  const fim = dias[dias.length - 1];
  const inicioAnterior = diaBr(agora - (2 * periodo - 1) * DIA_MS);
  const fimAnterior = diaBr(agora - periodo * DIA_MS);

  const [porDia, anterior, top, cats, disp, termos, semRes, semVisita, ativos, primeiro] = await Promise.all([
    c.execute({
      sql: `SELECT dia, tipo, COUNT(*) AS n FROM eventos
            WHERE dia BETWEEN ? AND ? GROUP BY dia, tipo`,
      args: [inicio, fim],
    }),
    c.execute({
      sql: `SELECT tipo, COUNT(*) AS n FROM eventos WHERE dia BETWEEN ? AND ? GROUP BY tipo`,
      args: [inicioAnterior, fimAnterior],
    }),
    c.execute({
      sql: `SELECT e.sku, p.titulo,
              SUM(e.tipo = 'visita') AS visitas, SUM(e.tipo IN ('clique', 'clique_ml', 'clique_shopee')) AS cliques
            FROM eventos e JOIN produtos p ON p.sku_pai = e.sku
            WHERE e.dia BETWEEN ? AND ? AND e.tipo IN ('visita', 'clique', 'clique_ml', 'clique_shopee')
            GROUP BY e.sku ORDER BY visitas DESC, cliques DESC LIMIT 10`,
      args: [inicio, fim],
    }),
    c.execute({
      sql: `SELECT p.categoria,
              SUM(e.tipo = 'visita') AS visitas, SUM(e.tipo IN ('clique', 'clique_ml', 'clique_shopee')) AS cliques
            FROM eventos e JOIN produtos p ON p.sku_pai = e.sku
            WHERE e.dia BETWEEN ? AND ? AND e.tipo IN ('visita', 'clique', 'clique_ml', 'clique_shopee')
            GROUP BY p.categoria ORDER BY visitas DESC`,
      args: [inicio, fim],
    }),
    c.execute({
      sql: `SELECT dispositivo, COUNT(*) AS n FROM eventos
            WHERE dia BETWEEN ? AND ? AND tipo = 'visita' GROUP BY dispositivo`,
      args: [inicio, fim],
    }),
    c.execute({
      sql: `SELECT termo, COUNT(*) AS vezes FROM eventos
            WHERE dia BETWEEN ? AND ? AND tipo = 'busca'
            GROUP BY termo ORDER BY vezes DESC LIMIT 10`,
      args: [inicio, fim],
    }),
    c.execute({
      sql: `SELECT termo, COUNT(*) AS vezes FROM eventos
            WHERE dia BETWEEN ? AND ? AND tipo = 'busca' AND resultados = 0
            GROUP BY termo ORDER BY vezes DESC LIMIT 10`,
      args: [inicio, fim],
    }),
    c.execute({
      sql: `SELECT COUNT(*) AS n FROM produtos p WHERE p.ativo = 1 AND NOT EXISTS (
              SELECT 1 FROM eventos e WHERE e.sku = p.sku_pai AND e.tipo = 'visita' AND e.dia BETWEEN ? AND ?)`,
      args: [inicio, fim],
    }),
    c.execute("SELECT COUNT(*) AS n FROM produtos WHERE ativo = 1"),
    c.execute("SELECT MIN(dia) AS dia FROM eventos"),
  ]);

  const mapa = new Map<string, number>();
  for (const r of porDia.rows) mapa.set(`${r.dia}|${r.tipo}`, Number(r.n));
  const visitasPorDia = dias.map((d) => mapa.get(`${d}|visita`) ?? 0);
  const cliquesPorDia = dias.map((d) =>
    (mapa.get(`${d}|clique`) ?? 0) + (mapa.get(`${d}|clique_ml`) ?? 0) + (mapa.get(`${d}|clique_shopee`) ?? 0),
  );
  const buscasPeriodo = dias.reduce((s, d) => s + (mapa.get(`${d}|busca`) ?? 0), 0);

  const ant = new Map(anterior.rows.map((r) => [r.tipo as string, Number(r.n)]));
  const soma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const visitas = soma(visitasPorDia);
  const cliques = soma(cliquesPorDia);
  const visitasAnt = ant.get("visita") ?? 0;
  const cliquesAnt = (ant.get("clique") ?? 0) + (ant.get("clique_ml") ?? 0) + (ant.get("clique_shopee") ?? 0);

  const dispMap = new Map(disp.rows.map((r) => [r.dispositivo as string, Number(r.n)]));

  return {
    dias,
    visitasPorDia,
    cliquesPorDia,
    kpis: {
      visitas: { atual: visitas, anterior: visitasAnt },
      cliques: { atual: cliques, anterior: cliquesAnt },
      taxa: { atual: visitas ? cliques / visitas : 0, anterior: visitasAnt ? cliquesAnt / visitasAnt : 0 },
      buscas: { atual: buscasPeriodo, anterior: ant.get("busca") ?? 0 },
    },
    topProdutos: top.rows.map((r) => ({
      sku: r.sku as string,
      titulo: r.titulo as string,
      visitas: Number(r.visitas),
      cliques: Number(r.cliques),
    })),
    categorias: cats.rows.map((r) => ({
      categoria: r.categoria as string,
      visitas: Number(r.visitas),
      cliques: Number(r.cliques),
    })),
    dispositivos: { celular: dispMap.get("celular") ?? 0, computador: dispMap.get("computador") ?? 0 },
    buscas: termos.rows.map((r) => ({ termo: r.termo as string, vezes: Number(r.vezes) })),
    buscasSemResultado: semRes.rows.map((r) => ({ termo: r.termo as string, vezes: Number(r.vezes) })),
    semVisita: Number(semVisita.rows[0].n),
    ativos: Number(ativos.rows[0].n),
    primeiroEvento: (primeiro.rows[0]?.dia as string) ?? null,
  };
}
