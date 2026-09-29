import Link from "next/link";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";
import FormProduto from "@/components/admin/FormProduto";
import { exigirLogin } from "@/lib/auth";
import { listarTodasCategorias } from "@/lib/produtos";

export const metadata = { title: "Novo produto · Painel" };

export default async function NovoProduto() {
  await exigirLogin();
  const categorias = await listarTodasCategorias();

  return (
    <>
      <CabecalhoAdmin ativa="produtos" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Link href="/admin/produtos" className="text-sm text-gray-500 hover:text-marca">← Produtos</Link>
        <h1 className="mb-6 mt-2 text-2xl font-bold">Novo produto</h1>
        <FormProduto
          categorias={categorias}
          inicial={{
            titulo: "", categoria: "", preco: "", link_ml: "", imagens: "",
            descricao: "", ativo: true, protegido: true, destaque: false, frase_destaque: "",
          }}
        />
      </main>
    </>
  );
}
