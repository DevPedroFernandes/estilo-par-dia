import Link from "next/link";
import { sair } from "@/app/admin/acoes";

const ABAS = [
  { id: "dashboard", rotulo: "Dashboard", href: "/admin/painel" },
  { id: "produtos", rotulo: "Produtos", href: "/admin/produtos" },
] as const;

/** Topo de todas as telas do painel: abas, "Ver site" e "Sair". */
export default function CabecalhoAdmin({ ativa }: { ativa: "dashboard" | "produtos" }) {
  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-5">
          <p className="text-lg font-extrabold text-marca">Painel</p>
          <nav className="flex gap-1">
            {ABAS.map((a) => (
              <Link
                key={a.id}
                href={a.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  a.id === ativa ? "bg-marca-claro text-marca" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {a.rotulo}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <a href="/" target="_blank" rel="noopener"
             className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium hover:border-marca hover:text-marca">
            Ver site
          </a>
          <form action={sair}>
            <button className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700">Sair</button>
          </form>
        </div>
      </div>
    </header>
  );
}
