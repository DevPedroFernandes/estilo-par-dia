import Link from "next/link";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";
import GraficoLinha from "@/components/admin/GraficoLinha";
import { exigirLogin } from "@/lib/auth";
import { calcularMetricas, type Periodo } from "@/lib/metricas";

export const metadata = { title: "Dashboard · Painel" };

// Cores das séries (validadas para daltonismo): roxo da marca e laranja.
const COR_VISITAS = "#9333ea";
const COR_CLIQUES = "#eb6834";

const num = (n: number) => n.toLocaleString("pt-BR");
const cliques = (n: number) => `${num(n)} ${n === 1 ? "clique" : "cliques"}`;
const pct = (n: number) => `${(n * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

/** Variação contra o período anterior, com seta + texto (nunca só cor). */
function Variacao({ atual, anterior, emPontos }: { atual: number; anterior: number; emPontos?: boolean }) {
  if (emPontos) {
    const d = (atual - anterior) * 100;
    if (!anterior && !atual) return <span className="text-gray-400">—</span>;
    if (Math.abs(d) < 0.05) return <span className="text-gray-500">= igual ao período anterior</span>;
    const sobe = d > 0;
    return (
      <span className={sobe ? "text-green-700" : "text-red-700"}>
        {sobe ? "▲" : "▼"} {Math.abs(d).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p. vs. anterior
      </span>
    );
  }
  if (!anterior) return <span className="text-gray-400">{atual ? "sem dados do período anterior" : "—"}</span>;
  const d = (atual - anterior) / anterior;
  if (Math.abs(d) < 0.005) return <span className="text-gray-500">= igual ao período anterior</span>;
  const sobe = d > 0;
  return (
    <span className={sobe ? "text-green-700" : "text-red-700"}>
      {sobe ? "▲" : "▼"} {pct(Math.abs(d))} vs. anterior
    </span>
  );
}

function Kpi({ titulo, valor, children }: { titulo: string; valor: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className="mt-1 text-3xl font-extrabold text-gray-900">{valor}</p>
      <p className="mt-1 text-xs">{children}</p>
    </div>
  );
}

/** Barra horizontal com valor na ponta e detalhe no hover. */
function Barra({ valor, max, cor, dica }: { valor: number; max: number; cor: string; dica: string }) {
  const largura = max ? Math.max((valor / max) * 100, valor ? 2 : 0) : 0;
  return (
    <div className="group relative flex items-center gap-2" tabIndex={0}>
      <div className="h-3 flex-1">
        <div className="h-3 rounded-r transition-opacity group-hover:opacity-80" style={{ width: `${largura}%`, background: cor }} />
      </div>
      <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-gray-900">{num(valor)}</span>
      <div className="pointer-events-none absolute -top-8 left-0 z-10 hidden whitespace-nowrap rounded-md border border-gray-200 bg-white px-2 py-1 text-xs shadow-md group-hover:block group-focus:block">
        {dica}
      </div>
    </div>
  );
}

function Cartao({ titulo, sub, children, className = "" }: { titulo: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-xl bg-white p-5 shadow-sm ${className}`}>
      <h2 className="font-bold">{titulo}</h2>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="py-6 text-center text-sm text-gray-400">{texto}</p>;
}

type Props = { searchParams: Promise<{ dias?: string }> };

export default async function Dashboard({ searchParams }: Props) {
  await exigirLogin();
  const { dias } = await searchParams;
  const periodo: Periodo = dias === "7" ? 7 : dias === "90" ? 90 : 30;
  const m = await calcularMetricas(periodo);

  const maxTop = Math.max(0, ...m.topProdutos.map((p) => p.visitas));
  const maxCat = Math.max(0, ...m.categorias.map((c) => c.visitas));
  const totalDisp = m.dispositivos.celular + m.dispositivos.computador;
  const fatiaCel = totalDisp ? m.dispositivos.celular / totalDisp : 0;

  return (
    <>
      <CabecalhoAdmin ativa="dashboard" />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6">
        {/* Filtro de período: uma linha, acima de tudo que ele afeta */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <nav className="flex gap-1 rounded-lg bg-white p-1 shadow-sm" aria-label="Período">
            {([7, 30, 90] as const).map((p) => (
              <Link key={p} href={`/admin/painel?dias=${p}`}
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                      p === periodo ? "bg-marca text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}>
                {p} dias
              </Link>
            ))}
          </nav>
        </div>

        {!m.primeiroEvento && (
          <div className="rounded-xl bg-marca-claro px-4 py-3 text-sm text-marca-escuro">
            As métricas começam a contar agora. Conforme as pessoas visitarem o site, os números aparecem aqui.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi titulo="Visitas a produtos" valor={num(m.kpis.visitas.atual)}>
            <Variacao {...m.kpis.visitas} />
          </Kpi>
          <Kpi titulo="Cliques no Mercado Livre" valor={num(m.kpis.cliques.atual)}>
            <Variacao {...m.kpis.cliques} />
          </Kpi>
          <Kpi titulo="Taxa de clique" valor={pct(m.kpis.taxa.atual)}>
            <Variacao {...m.kpis.taxa} emPontos />
          </Kpi>
          <Kpi titulo="Buscas na vitrine" valor={num(m.kpis.buscas.atual)}>
            <Variacao {...m.kpis.buscas} />
          </Kpi>
        </div>

        <Cartao titulo="Visitas e cliques por dia" sub={`Últimos ${periodo} dias`}>
          <GraficoLinha
            dias={m.dias}
            series={[
              { nome: "Visitas", cor: COR_VISITAS, valores: m.visitasPorDia },
              { nome: "Cliques no ML", cor: COR_CLIQUES, valores: m.cliquesPorDia },
            ]}
          />
        </Cartao>

        <div className="grid gap-6 lg:grid-cols-5">
          <Cartao titulo="Produtos mais vistos" sub="Visitas no período · cliques no ML · taxa de clique" className="lg:col-span-3">
            {m.topProdutos.length ? (
              <ol className="space-y-3">
                {m.topProdutos.map((p, i) => (
                  <li key={p.sku}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                      <Link href={`/admin/produtos/${encodeURIComponent(p.sku)}`} className="truncate hover:text-marca">
                        <span className="mr-1 text-gray-400">{i + 1}.</span>{p.titulo}
                      </Link>
                      <span className="shrink-0 text-xs text-gray-500">
                        {cliques(p.cliques)} · {p.visitas ? pct(p.cliques / p.visitas) : "—"}
                      </span>
                    </div>
                    <Barra valor={p.visitas} max={maxTop} cor={COR_VISITAS}
                           dica={`${num(p.visitas)} visitas · ${cliques(p.cliques)}`} />
                  </li>
                ))}
              </ol>
            ) : <Vazio texto="Nenhuma visita a produto neste período." />}
            <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
              {m.semVisita} de {m.ativos} produtos ativos não tiveram nenhuma visita neste período.
            </p>
          </Cartao>

          <div className="min-w-0 space-y-6 lg:col-span-2">
            <Cartao titulo="Visitas por categoria">
              {m.categorias.length ? (
                <ul className="space-y-3">
                  {m.categorias.map((c) => (
                    <li key={c.categoria}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{c.categoria}</span>
                        <span className="text-xs text-gray-500">{cliques(c.cliques)}</span>
                      </div>
                      <Barra valor={c.visitas} max={maxCat} cor={COR_VISITAS}
                             dica={`${c.categoria}: ${num(c.visitas)} visitas · ${cliques(c.cliques)}`} />
                    </li>
                  ))}
                </ul>
              ) : <Vazio texto="Sem dados no período." />}
            </Cartao>

            <Cartao titulo="Aparelho dos visitantes">
              {totalDisp ? (
                <>
                  <div className="flex h-4 gap-0.5 overflow-hidden rounded" role="img"
                       aria-label={`Celular ${pct(fatiaCel)}, computador ${pct(1 - fatiaCel)}`}>
                    {m.dispositivos.celular > 0 && (
                      <div title={`Celular: ${num(m.dispositivos.celular)} visitas`} style={{ width: `${fatiaCel * 100}%`, background: COR_VISITAS }} />
                    )}
                    {m.dispositivos.computador > 0 && (
                      <div title={`Computador: ${num(m.dispositivos.computador)} visitas`} style={{ width: `${(1 - fatiaCel) * 100}%`, background: COR_CLIQUES }} />
                    )}
                  </div>
                  <div className="mt-3 flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm" style={{ background: COR_VISITAS }} />
                      Celular <strong>{pct(fatiaCel)}</strong>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm" style={{ background: COR_CLIQUES }} />
                      Computador <strong>{pct(1 - fatiaCel)}</strong>
                    </span>
                  </div>
                </>
              ) : <Vazio texto="Sem visitas no período." />}
            </Cartao>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Cartao titulo="O que mais buscam" sub="Termos digitados na busca da vitrine">
            {m.buscas.length ? (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {m.buscas.map((b) => (
                    <tr key={b.termo}>
                      <td className="py-2">{b.termo}</td>
                      <td className="py-2 text-right tabular-nums text-gray-600">{num(b.vezes)}×</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <Vazio texto="Nenhuma busca no período." />}
          </Cartao>

          <Cartao titulo="Buscas sem resultado" sub="Procuraram e não acharam: ideia de estampa nova?">
            {m.buscasSemResultado.length ? (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {m.buscasSemResultado.map((b) => (
                    <tr key={b.termo}>
                      <td className="py-2">{b.termo}</td>
                      <td className="py-2 text-right tabular-nums text-gray-600">{num(b.vezes)}×</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <Vazio texto="Toda busca encontrou algum produto." />}
          </Cartao>
        </div>
      </main>
    </>
  );
}
