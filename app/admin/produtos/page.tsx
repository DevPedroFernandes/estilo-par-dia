import Link from "next/link";
import CabecalhoAdmin from "@/components/admin/CabecalhoAdmin";
import ImportarCsv from "@/components/admin/ImportarCsv";
import { exigirLogin } from "@/lib/auth";
import { db, getConfig } from "@/lib/db";
import { semAcento } from "@/lib/importar";
import { formatarBrl } from "@/lib/produtos";
import { alternarAtivo } from "../acoes";

export const metadata = { title: "Produtos · Painel" };

const AVISOS: Record<string, string> = {
  criado: "Produto cadastrado.",
  editado: "Alterações salvas.",
  excluido: "Produto excluído.",
};

type Props = { searchParams: Promise<{ ok?: string; q?: string }> };

export default async function Produtos({ searchParams }: Props) {
  await exigirLogin();
  const { ok, q = "" } = await searchParams;

  const c = await db();
  let sql = `SELECT sku_pai, titulo, categoria, preco, ativo, imagem, origem, protegido, destaque, visualizacoes, cliques_ml
             FROM produtos`;
  const args: string[] = [];
  const termo = semAcento(q).trim();
  if (termo) {
    sql += " WHERE busca LIKE ? OR sku_pai LIKE ?";
    args.push(`%${termo}%`, `%${q.trim()}%`);
  }
  sql += " ORDER BY ordem_csv ASC";
  const [lista, ultimoCsv] = await Promise.all([c.execute({ sql, args }), getConfig("ultimo_csv_nome")]);

  return (
    <>
      <CabecalhoAdmin ativa="produtos" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {ok && AVISOS[ok] && (
          <div role="status" className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{AVISOS[ok]}</div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Produtos</h1>
          <div className="flex gap-2">
            <Link href="/admin/produtos/importar"
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold hover:border-marca hover:text-marca">
              Importar CSV
            </Link>
            <Link href="/admin/produtos/novo"
                  className="rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-white hover:bg-marca-escuro">
              + Novo produto
            </Link>
          </div>
        </div>

        <ImportarCsv ultimoCsv={ultimoCsv} />

        <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
          <form className="flex gap-2 border-b border-gray-100 p-3">
            <input name="q" defaultValue={q} placeholder="Filtrar por nome ou código..."
                   className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-marca" />
            <button className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold hover:border-marca hover:text-marca">Filtrar</button>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3 text-right">Preço</th>
                  <th className="px-4 py-3 text-right" title="Visualizações da página / cliques no botão do ML (total)">Acessos</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lista.rows.map((p) => {
                  const sku = p.sku_pai as string;
                  const ativo = Number(p.ativo) === 1;
                  return (
                    <tr key={sku} className={ativo ? "" : "bg-gray-50 text-gray-400"}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                            {p.imagem ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.imagem as string} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className={`font-medium ${ativo ? "text-gray-900" : ""}`}>{p.titulo as string}</p>
                            <p className="text-xs text-gray-400">
                              <span className="font-mono">{sku}</span> · {p.categoria as string}
                              {Number(p.destaque) === 1 && <span className="ml-2 rounded bg-yellow-100 px-1.5 py-0.5 font-semibold text-yellow-900">★ Banner</span>}
                              {p.origem === "manual" && <span className="ml-2 rounded bg-marca-claro px-1.5 py-0.5 font-semibold text-marca">Manual</span>}
                              {p.origem !== "manual" && Number(p.protegido) === 1 && (
                                <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-800" title="O CSV não sobrescreve este produto">Editado</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">{formatarBrl(Number(p.preco))}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
                        {Number(p.visualizacoes)} / {Number(p.cliques_ml)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <form action={alternarAtivo}>
                          <input type="hidden" name="sku" value={sku} />
                          <button className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            ativo ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                          }`}>
                            {ativo ? "Ativo" : "Inativo"}
                          </button>
                        </form>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/produtos/${encodeURIComponent(sku)}`}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-marca hover:bg-marca-claro">
                          Editar
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {!lista.rows.length && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">Nenhum produto encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
