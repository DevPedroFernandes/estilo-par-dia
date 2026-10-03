import Link from "next/link";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";
import ImportarCsv from "@/components/admin/ImportarCsv";
import { exigirLogin } from "@/lib/auth";
import { getConfig } from "@/lib/db";

export const metadata = { title: "Importar produtos · Painel", robots: { index: false, follow: false } };

export default async function ImportarProdutos() {
  await exigirLogin();
  const ultimoCsv = await getConfig("ultimo_csv_nome");

  return (
    <>
      <CabecalhoAdmin ativa="produtos" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Link href="/admin/produtos" className="text-sm text-gray-500 hover:text-marca">Voltar aos produtos</Link>
        <h1 className="mt-3 text-2xl font-bold">Importar produtos</h1>
        <ImportarCsv ultimoCsv={ultimoCsv} />
      </main>
    </>
  );
}