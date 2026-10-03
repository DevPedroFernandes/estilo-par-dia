import Link from "next/link";
import BuscaVitrine from "@/components/BuscaVitrine";

/** Topo da loja: logo + busca. A busca mantém a categoria e a ordenação atuais. */
export default function Cabecalho({ q = "", cat = "", ordem = "populares" }: { q?: string; cat?: string; ordem?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
        <Link href="/" className="shrink-0 text-xl font-extrabold tracking-tight text-marca">
          Estilo Paródia
        </Link>
        <div role="search" className="flex-1">
          <BuscaVitrine q={q} cat={cat} ordem={ordem} />
        </div>
      </div>
    </header>
  );
}
