"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Visitas × cliques por dia. Duas linhas no mesmo eixo (as duas são contagens).
 * Hover: linha vertical que acompanha o mouse e mostra os dois valores do dia.
 * A tabela logo abaixo (em "Ver tabela") traz os mesmos números sem precisar do mouse.
 */

type Serie = { nome: string; cor: string; valores: number[] };

const ALTURA = 240;
const M = { topo: 16, dir: 64, base: 28, esq: 36 };

function passoLimpo(max: number): number {
  if (max <= 4) return 1;
  const bruto = max / 4;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const n = bruto / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

function rotuloDia(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export default function GraficoLinha({ dias, series }: { dias: string[]; series: Serie[] }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(640);
  const [foco, setFoco] = useState<number | null>(null);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => setLargura(Math.max(280, e.contentRect.width)));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const maxBruto = Math.max(1, ...series.flatMap((s) => s.valores));
  const passo = passoLimpo(maxBruto);
  const topoEixo = Math.ceil(maxBruto / passo) * passo;
  const ticks = Array.from({ length: Math.round(topoEixo / passo) + 1 }, (_, i) => i * passo);

  const areaL = largura - M.esq - M.dir;
  const areaA = ALTURA - M.topo - M.base;
  const x = (i: number) => M.esq + (dias.length === 1 ? areaL / 2 : (i / (dias.length - 1)) * areaL);
  const y = (v: number) => M.topo + areaA - (v / topoEixo) * areaA;

  // Rótulos do eixo X: no máximo ~7, sempre incluindo o último dia.
  const salto = Math.ceil(dias.length / 7);
  const indicesX = dias.map((_, i) => i).filter((i) => (dias.length - 1 - i) % salto === 0);

  function aoMover(e: React.PointerEvent<SVGRectElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = Math.round((px / r.width) * (dias.length - 1));
    setFoco(Math.min(dias.length - 1, Math.max(0, i)));
  }

  const ultimo = dias.length - 1;

  return (
    <div>
      {/* Legenda: identidade de cada linha, nunca só pela cor */}
      <div className="mb-3 flex flex-wrap gap-4 text-sm text-gray-600">
        {series.map((s) => (
          <span key={s.nome} className="flex items-center gap-2">
            <span className="inline-block h-0.5 w-4 rounded" style={{ background: s.cor }} />
            {s.nome}
          </span>
        ))}
      </div>

      <div ref={caixa} className="relative">
        <svg width={largura} height={ALTURA} role="img"
             aria-label={`Gráfico de ${series.map((s) => s.nome).join(" e ")} por dia`}>
          {/* Grade e eixo Y */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.esq} x2={largura - M.dir} y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeWidth={1} />
              <text x={M.esq - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#6b7280">
                {t.toLocaleString("pt-BR")}
              </text>
            </g>
          ))}
          {/* Eixo X */}
          {indicesX.map((i) => (
            <text key={i} x={x(i)} y={ALTURA - 8} textAnchor="middle" fontSize={11} fill="#6b7280">
              {rotuloDia(dias[i])}
            </text>
          ))}

          {/* Linhas + ponto final com rótulo direto */}
          {series.map((s) => (
            <g key={s.nome}>
              <polyline
                fill="none"
                stroke={s.cor}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={s.valores.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
              />
              <circle cx={x(ultimo)} cy={y(s.valores[ultimo])} r={4} fill={s.cor} stroke="#fff" strokeWidth={2} />
            </g>
          ))}
          {/* Rótulos no fim das linhas (afastados se ficarem muito perto) */}
          {(() => {
            const pos = series.map((s) => ({ s, yy: y(s.valores[ultimo]) }));
            if (pos.length === 2 && Math.abs(pos[0].yy - pos[1].yy) < 14) {
              const [a, b] = pos[0].yy <= pos[1].yy ? [pos[0], pos[1]] : [pos[1], pos[0]];
              a.yy -= 7;
              b.yy += 7;
            }
            return pos.map(({ s, yy }) => (
              <text key={s.nome} x={x(ultimo) + 10} y={yy} dy="0.32em" fontSize={12} fill="#111827" fontWeight={600}>
                {s.valores[ultimo].toLocaleString("pt-BR")}
              </text>
            ));
          })()}

          {/* Cursor vertical no dia em foco */}
          {foco !== null && (
            <g pointerEvents="none">
              <line x1={x(foco)} x2={x(foco)} y1={M.topo} y2={M.topo + areaA} stroke="#9ca3af" strokeWidth={1} />
              {series.map((s) => (
                <circle key={s.nome} cx={x(foco)} cy={y(s.valores[foco])} r={4} fill={s.cor} stroke="#fff" strokeWidth={2} />
              ))}
            </g>
          )}

          {/* Área de captura do mouse (maior que as linhas) */}
          <rect
            x={M.esq}
            y={M.topo}
            width={areaL}
            height={areaA}
            fill="transparent"
            tabIndex={0}
            onPointerMove={aoMover}
            onPointerLeave={() => setFoco(null)}
            onFocus={() => setFoco(ultimo)}
            onBlur={() => setFoco(null)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setFoco((f) => Math.max(0, (f ?? ultimo) - 1));
              if (e.key === "ArrowRight") setFoco((f) => Math.min(ultimo, (f ?? ultimo) + 1));
            }}
            style={{ outline: "none" }}
          />
        </svg>

        {foco !== null && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md"
            style={{
              top: M.topo,
              left: Math.min(Math.max(x(foco) + 12, 0), largura - 150),
            }}
          >
            <p className="mb-1 text-gray-500">{rotuloDia(dias[foco])}</p>
            {series.map((s) => (
              <p key={s.nome} className="flex items-center gap-2">
                <span className="inline-block h-0.5 w-3 rounded" style={{ background: s.cor }} />
                <strong className="text-sm text-gray-900">{s.valores[foco].toLocaleString("pt-BR")}</strong>
                <span className="text-gray-500">{s.nome}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-gray-500 hover:text-marca">Ver tabela</summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-gray-500">
              <tr>
                <th className="py-1 pr-4">Dia</th>
                {series.map((s) => <th key={s.nome} className="py-1 pr-4 text-right">{s.nome}</th>)}
              </tr>
            </thead>
            <tbody>
              {dias.map((d, i) => (
                <tr key={d} className="border-t border-gray-100">
                  <td className="py-1 pr-4">{rotuloDia(d)}</td>
                  {series.map((s) => <td key={s.nome} className="py-1 pr-4 text-right">{s.valores[i]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
