import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Cabecalho from "@/components/Cabecalho";
import Galeria from "@/components/Galeria";
import VariantesProduto from "@/components/VariantesProduto";
import { buscarProduto, formatarBrl } from "@/lib/produtos";

type Props = { params: Promise<{ sku: string }>; searchParams: Promise<{ aviso?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await buscarProduto((await params).sku);
  return { title: p ? `${p.titulo} · Estilo Paródia` : "Estilo Paródia" };
}

export default async function PaginaProduto({ params, searchParams }: Props) {
  const { sku } = await params;
  const { aviso } = await searchParams;
  const p = await buscarProduto(sku);
  if (!p) notFound();

  return (
    <>
      <Cabecalho />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {aviso === "sem-link" && (
          <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Este produto ainda não tem link de compra disponível.
          </div>
        )}

        <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-marca">
          ← Voltar aos produtos
        </Link>

        <div className="grid gap-6 md:grid-cols-2 md:gap-10">
          <Galeria imagens={p.imagens} titulo={p.titulo} />

          <section className="flex flex-col gap-5">
            <div>
              <p className="text-sm font-medium text-marca">{p.categoria}</p>
              <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">{p.titulo}</h1>
              <p className="mt-3 text-3xl font-extrabold">{formatarBrl(p.preco)}</p>
              <p className="mt-1 text-sm text-gray-600">3x de {formatarBrl(p.preco / 3)} sem juros</p>
            </div>

              <VariantesProduto cores={p.cores} tamanhos={p.tamanhos} />

              <a href={`/ir/${p.sku_pai}/ml`} target="_blank" rel="noopener"
               className="rounded-xl bg-ml py-3.5 text-center text-base font-bold text-gray-900 shadow-sm hover:bg-ml-escuro">
              Comprar no Mercado Livre
            </a>
              {p.link_shopee ? (
                <a href={`/ir/${p.sku_pai}/shopee`} target="_blank" rel="noopener"
                   className="rounded-xl bg-shopee py-3.5 text-center text-base font-bold text-white shadow-sm hover:bg-shopee-escuro">
                  Comprar na Shopee
                </a>
              ) : (
                <span className="rounded-xl bg-gray-100 py-3.5 text-center text-base font-bold text-gray-500">
                  Shopee: em breve
                </span>
              )}

            <div>
              <h2 className="mb-2 text-sm font-semibold text-gray-700">Descrição</h2>
              <div className="space-y-3 text-sm leading-relaxed text-gray-700">
                {p.descricao.split("\n\n").filter((t) => t.trim()).map((t, i) => (
                  <p key={i}>{t.replace(/\n/g, " ")}</p>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
