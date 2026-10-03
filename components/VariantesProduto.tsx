"use client";

import { useState } from "react";
import type { Cor } from "@/lib/importar";

export default function VariantesProduto({ cores, tamanhos }: { cores: Cor[]; tamanhos: string[] }) {
  const [corSelecionada, setCorSelecionada] = useState(cores[0]?.nome ?? "");
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState(tamanhos[0] ?? "");

  if (!cores.length && !tamanhos.length) {
    return <p className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
      Consulte as opções de cores e tamanhos no anúncio.
    </p>;
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      {cores.length > 0 && (
        <fieldset>
          <legend className="text-sm font-semibold text-gray-800">
            Cor{corSelecionada ? `: ${corSelecionada}` : ""}
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {cores.map((cor) => (
              <button
                key={`${cor.nome}-${cor.hex}`}
                type="button"
                onClick={() => setCorSelecionada(cor.nome)}
                aria-label={cor.nome}
                aria-pressed={corSelecionada === cor.nome}
                className={`h-8 w-8 rounded-full border border-gray-300 outline-offset-2 ${corSelecionada === cor.nome ? "outline outline-2 outline-marca" : ""}`}
                style={{ backgroundColor: cor.hex }}
              />
            ))}
          </div>
        </fieldset>
      )}
      {tamanhos.length > 0 && (
        <fieldset>
          <legend className="text-sm font-semibold text-gray-800">Tamanho</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {tamanhos.map((tamanho) => (
              <button
                key={tamanho}
                type="button"
                onClick={() => setTamanhoSelecionado(tamanho)}
                aria-pressed={tamanhoSelecionado === tamanho}
                className={`min-w-10 rounded-md border px-3 py-1.5 text-sm font-semibold ${tamanhoSelecionado === tamanho ? "border-marca bg-marca text-white" : "border-gray-300 hover:border-marca"}`}
              >
                {tamanho}
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}