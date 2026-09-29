import Link from "next/link";

/** Topo da loja: logo + busca. A busca mantém a categoria e a ordenação atuais. */
export default function Cabecalho({ q = "", cat = "", ordem = "populares" }: { q?: string; cat?: string; ordem?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
        <Link href="/" className="shrink-0 text-xl font-extrabold tracking-tight text-marca">
          Estilo Paródia
        </Link>
        <form action="/" method="get" role="search" className="flex-1">
          {cat && <input type="hidden" name="cat" value={cat} />}
          {ordem !== "populares" && <input type="hidden" name="ordem" value={ordem} />}
          <label htmlFor="busca" className="sr-only">Buscar produtos</label>
          <input
            id="busca"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar estampa, camiseta, vestido..."
            className="w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-marca focus:ring-2 focus:ring-marca/20"
          />
        </form>
      </div>
    </header>
  );
}
