"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Destaque } from "@/lib/produtos";

const INTERVALO_MS = 6000;

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Banner em carrossel da home. Troca sozinho a cada 6 s, pausa com o mouse
 * em cima (ou foco do teclado), aceita arrastar no celular e respeita quem
 * pediu menos animação no sistema.
 */
export default function BannerCarrossel({ slides }: { slides: Destaque[] }) {
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [menosAnimacao, setMenosAnimacao] = useState(false);
  const inicioToque = useRef<number | null>(null);
  const total = slides.length;

  const ir = useCallback((i: number) => setAtual(((i % total) + total) % total), [total]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMenosAnimacao(mq.matches);
    const ouvir = () => setMenosAnimacao(mq.matches);
    mq.addEventListener("change", ouvir);
    return () => mq.removeEventListener("change", ouvir);
  }, []);

  useEffect(() => {
    if (pausado || menosAnimacao || total < 2) return;
    const t = setTimeout(() => ir(atual + 1), INTERVALO_MS);
    return () => clearTimeout(t);
  }, [atual, pausado, menosAnimacao, total, ir]);

  if (!total) return null;

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Produtos em destaque"
      className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-marca-escuro via-marca to-fuchsia-500 text-white shadow-sm"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
      onPointerDown={(e) => (inicioToque.current = e.clientX)}
      onPointerUp={(e) => {
        if (inicioToque.current === null) return;
        const dx = e.clientX - inicioToque.current;
        inicioToque.current = null;
        if (Math.abs(dx) > 50) ir(atual + (dx < 0 ? 1 : -1));
      }}
    >
      <div
        className={`flex ${menosAnimacao ? "" : "transition-transform duration-500 ease-out"}`}
        style={{ transform: `translateX(-${atual * 100}%)` }}
      >
        {slides.map((s, i) => (
          <div
            key={s.sku_pai}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} de ${total}`}
            aria-hidden={i !== atual}
            inert={i !== atual}
            className="grid w-full shrink-0 items-center gap-6 px-6 pb-14 pt-8 sm:grid-cols-5 sm:px-20 sm:py-12"
          >
            <div className="order-2 sm:order-1 sm:col-span-3">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">
                Destaque · {s.categoria}
              </p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-5xl">{s.titulo_banner}</h2>
              <p className="mt-3 max-w-md text-base text-white/85 sm:text-lg">{s.subtitulo_banner}</p>
              <p className="mt-5 text-sm text-white/80">
                Estampa <strong className="text-white">{s.estampa}</strong> · por{" "}
                <strong className="text-white">{brl(s.preco)}</strong>
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={`/ir/${s.sku_pai}`} target="_blank" rel="noopener"
                   className="rounded-full bg-ml px-6 py-3 text-sm font-bold text-gray-900 shadow-sm hover:bg-ml-escuro">
                  Comprar no Mercado Livre
                </a>
                <Link href={`/produto/${s.sku_pai}`}
                      className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
                  Ver detalhes
                </Link>
              </div>
            </div>
            <Link href={`/produto/${s.sku_pai}`} tabIndex={-1} aria-hidden
                  className="order-1 mx-auto block w-48 sm:order-2 sm:col-span-2 sm:w-full sm:max-w-xs">
              <div className="aspect-square overflow-hidden rounded-2xl bg-white shadow-xl ring-4 ring-white/20 sm:rotate-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.imagem} alt="" referrerPolicy="no-referrer" draggable={false}
                     loading={i === 0 ? "eager" : "lazy"} className="h-full w-full object-cover" />
              </div>
            </Link>
          </div>
        ))}
      </div>

      {total > 1 && (
        <>
          <button type="button" onClick={() => ir(atual - 1)} aria-label="Destaque anterior"
                  className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl hover:bg-white/30 sm:flex">
            ‹
          </button>
          <button type="button" onClick={() => ir(atual + 1)} aria-label="Próximo destaque"
                  className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-xl hover:bg-white/30 sm:flex">
            ›
          </button>
          <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2">
            {slides.map((s, i) => (
              <button key={s.sku_pai} type="button" onClick={() => ir(i)}
                      aria-label={`Ir para o destaque ${i + 1}`} aria-current={i === atual}
                      className={`h-2 rounded-full transition-all ${i === atual ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
