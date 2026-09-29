"use client";

import { useState } from "react";

/** Imagem grande + miniaturas que trocam a principal ao clicar. */
export default function Galeria({ imagens, titulo }: { imagens: string[]; titulo: string }) {
  const [atual, setAtual] = useState(0);

  return (
    <section>
      <div className="aspect-square overflow-hidden rounded-xl bg-white shadow-sm">
        {imagens[atual] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagens[atual]} alt={titulo} referrerPolicy="no-referrer" className="h-full w-full object-contain" />
        )}
      </div>
      {imagens.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {imagens.map((img, i) => (
            <button
              key={img}
              type="button"
              onClick={() => setAtual(i)}
              aria-label={`Ver foto ${i + 1}`}
              className={`aspect-square overflow-hidden rounded-lg border-2 bg-white ${
                i === atual ? "border-marca" : "border-transparent hover:border-gray-300"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
