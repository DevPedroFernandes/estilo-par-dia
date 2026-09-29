"use client";

import { useEffect } from "react";
import { registrarBusca, registrarVisita } from "@/lib/visitas";

/** Registra a visita a um produto depois que a página abre no navegador. */
export default function RegistrarVisita({ sku }: { sku: string }) {
  useEffect(() => {
    registrarVisita(sku).catch(() => {});
  }, [sku]);
  return null;
}

/** Registra uma busca da vitrine (termo e quantidade de resultados). */
export function RegistrarBusca({ termo, resultados }: { termo: string; resultados: number }) {
  useEffect(() => {
    registrarBusca(termo, resultados).catch(() => {});
  }, [termo, resultados]);
  return null;
}
