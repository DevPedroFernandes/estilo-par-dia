import Link from "next/link";
import { Suspense } from "react";
import BannerCarrossel from "@/components/BannerCarrossel";
import Cabecalho from "@/components/Cabecalho";
import { RegistrarBusca } from "@/components/RegistrarVisita";
import SeletorOrdem from "@/components/SeletorOrdem";
import { formatarBrl, listarCategorias, listarDestaques, listarProdutos, ORDENACOES, type Ordem } from "@/lib/produtos";

type Params = { q?: string | string[]; cat?: string | string[]; ordem?: string | string[] };

function um(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v ?? "").trim();
}

/** Monta a URL da vitrine mantendo só os filtros preenchidos. */
function urlVitrine(q: string, cat: string, ordem: string): string {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (cat) p.set("cat", cat);
  if (ordem !== "populares") p.set("ordem", ordem);
  const s = p.toString();
  return s ? `/?${s}` : "/";
}

export default async function Vitrine({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const q = um(sp.q).slice(0, 100);
  const cat = um(sp.cat);
  const ordemBruta = um(sp.ordem);
  const ordem: Ordem = ordemBruta in ORDENACOES ? (ordemBruta as Ordem) : "populares";

  // O banner só aparece na home "limpa" (sem busca nem categoria escolhida).
  const mostrarBanner = !q && !cat;
  const [produtos, categorias, destaques] = await Promise.all([
    listarProdutos(q, cat, ordem),
    listarCategorias(),
    mostrarBanner ? listarDestaques() : Promise.resolve([]),
  ]);
  const opcoes = Object.fromEntries(Object.entries(ORDENACOES).map(([k, v]) => [k, v.rotulo]));

  const chip = (ativo: boolean) =>
    `shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium ${
      ativo ? "border-marca bg-marca text-white" : "border-gray-200 bg-white text-gray-700 hover:border-marca hover:text-marca"
    }`;

  return (
    <>
      <Cabecalho q={q} cat={cat} ordem={ordem} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {mostrarBanner && <BannerCarrossel slides={destaques} />}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="Categorias" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            <Link href={urlVitrine(q, "", ordem)} className={chip(!cat)}>Todos</Link>
            {categorias.map((c) => (
              <Link key={c} href={urlVitrine(q, c, ordem)} className={chip(cat === c)}>{c}</Link>
            ))}
          </nav>
          <Suspense>
            <SeletorOrdem ordem={ordem} opcoes={opcoes} />
          </Suspense>
        </div>

        {q && <RegistrarBusca termo={q} resultados={produtos.length} />}
        {q && (
          <p className="mb-4 text-sm text-gray-500">
            {produtos.length} resultado{produtos.length === 1 ? "" : "s"} para “{q}”
          </p>
        )}

        {produtos.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {produtos.map((p) => (
              <article key={p.sku_pai} className="card flex flex-col overflow-hidden rounded-xl bg-white shadow-sm">
                <Link href={`/produto/${p.sku_pai}`} className="block aspect-square bg-gray-100">
                  {p.imagem && (
                    // eslint-disable-next-line @next/next/no-img-element -- imagens servidas direto do CDN do ML
                    <img src={p.imagem} alt={p.titulo} loading="lazy" referrerPolicy="no-referrer"
                         className="h-full w-full object-cover" />
                  )}
                </Link>
                <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
                  <Link href={`/produto/${p.sku_pai}`} title={p.titulo}
                        className="line-clamp-2 text-sm font-medium leading-snug hover:text-marca">
                    {p.titulo}
                  </Link>
                  <p className="mt-auto text-lg font-bold">{formatarBrl(p.preco)}</p>
                  <a href={`/ir/${p.sku_pai}`} target="_blank" rel="noopener"
                     className="rounded-lg bg-ml py-2 text-center text-sm font-semibold text-gray-900 hover:bg-ml-escuro">
                    Mercado Livre
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-lg font-semibold">Nenhum produto encontrado</p>
            <p className="mt-1 text-sm text-gray-500">Tente outra palavra ou veja todas as categorias.</p>
            <Link href="/" className="mt-6 inline-block rounded-full bg-marca px-6 py-2.5 font-semibold text-white hover:bg-marca-escuro">
              Ver todos
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
