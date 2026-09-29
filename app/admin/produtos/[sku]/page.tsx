import Link from "next/link";
import { notFound } from "next/navigation";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";
import FormProduto from "@/components/admin/FormProduto";
import { exigirLogin } from "@/lib/auth";
import { db } from "@/lib/db";
import { listarTodasCategorias } from "@/lib/produtos";

export const metadata = { title: "Editar produto · Painel" };

/** Texto salvo termina com o agradecimento padrão; no formulário mostramos sem ele. */
function descricaoParaEdicao(d: string): string {
  return d.replace(/\n*Obrigado por escolher a Estilo Paródia!\s*$/, "").trim();
}

export default async function EditarProduto({ params }: { params: Promise<{ sku: string }> }) {
  await exigirLogin();
  const { sku } = await params;
  const c = await db();
  const r = await c.execute({ sql: "SELECT * FROM produtos WHERE sku_pai = ?", args: [decodeURIComponent(sku)] });
  const p = r.rows[0];
  if (!p) notFound();
  const categorias = await listarTodasCategorias();
  const imagens = JSON.parse((p.imagens as string) || "[]") as string[];

  return (
    <>
      <CabecalhoAdmin ativa="produtos" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Link href="/admin/produtos" className="text-sm text-gray-500 hover:text-marca">← Produtos</Link>
        <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Editar produto</h1>
          {Number(p.ativo) === 1 && (
            <a href={`/produto/${encodeURIComponent(p.sku_pai as string)}`} target="_blank" rel="noopener"
               className="text-sm font-semibold text-marca hover:underline">Ver no site ↗</a>
          )}
        </div>
        <FormProduto
          sku={p.sku_pai as string}
          origem={p.origem as string}
          categorias={categorias}
          inicial={{
            titulo: p.titulo as string,
            categoria: p.categoria as string,
            preco: Number(p.preco).toFixed(2).replace(".", ","),
            link_ml: p.link_ml as string,
            imagens: (imagens.length ? imagens : [p.imagem as string]).filter(Boolean).join("\n"),
            descricao: descricaoParaEdicao(p.descricao as string),
            ativo: Number(p.ativo) === 1,
            destaque: Number(p.destaque) === 1,
            frase_destaque: (p.frase_destaque as string) ?? "",
            // Ao editar um produto do CSV, a proteção já vem marcada.
            protegido: true,
          }}
        />
      </main>
    </>
  );
}
