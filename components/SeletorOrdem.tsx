"use client";

import { useRouter, useSearchParams } from "next/navigation";

/** Seletor "Ordenar por". Troca só o parâmetro ?ordem= e mantém busca e categoria. */
export default function SeletorOrdem({ ordem, opcoes }: { ordem: string; opcoes: Record<string, string> }) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <div className="flex shrink-0 items-center gap-2">
      <label htmlFor="ordem" className="text-sm text-gray-500">Ordenar:</label>
      <select
        id="ordem"
        value={ordem}
        onChange={(e) => {
          const p = new URLSearchParams(params.toString());
          if (e.target.value === "populares") p.delete("ordem");
          else p.set("ordem", e.target.value);
          const qs = p.toString();
          router.push(qs ? `/?${qs}` : "/");
        }}
        className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-marca"
      >
        {Object.entries(opcoes).map(([valor, rotulo]) => (
          <option key={valor} value={valor}>{rotulo}</option>
        ))}
      </select>
    </div>
  );
}
