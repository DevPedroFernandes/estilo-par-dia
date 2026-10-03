"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = { q: string; cat: string; ordem: string };

export default function BuscaVitrine({ q, cat, ordem }: Props) {
  const router = useRouter();
  const [valor, setValor] = useState(q);
  const ultimaUrl = useRef<string | null>(null);

  useEffect(() => setValor(q), [q]);
  useEffect(() => {
    const params = new URLSearchParams();
    const busca = valor.trim();
    if (busca) params.set("q", busca);
    if (cat) params.set("cat", cat);
    if (ordem !== "populares") params.set("ordem", ordem);
    const query = params.toString();
    const url = query ? `/?${query}` : "/";

    if (ultimaUrl.current === null || ultimaUrl.current === url) {
      ultimaUrl.current = url;
      return;
    }
    const timer = window.setTimeout(() => {
      ultimaUrl.current = url;
      router.replace(url, { scroll: false });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [valor, cat, ordem, router]);

  return (
    <label htmlFor="busca" className="flex-1">
      <span className="sr-only">Buscar produtos</span>
      <input
        id="busca"
        type="search"
        value={valor}
        onChange={(event) => setValor(event.target.value)}
        placeholder="Buscar estampa, camiseta, vestido..."
        className="w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-marca focus:ring-2 focus:ring-marca/20"
      />
    </label>
  );
}