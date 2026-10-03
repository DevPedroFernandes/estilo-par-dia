"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { registrarBusca } from "@/lib/visitas";

/** Registra uma visita anónima depois que uma página pública abre no navegador. */
export default function RegistrarVisita() {
  const pathname = usePathname();
  useEffect(() => {
    fetch("/api/visita", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rota: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);
  return null;
}

/** Registra uma busca da vitrine (termo e quantidade de resultados). */
export function RegistrarBusca({ termo, resultados }: { termo: string; resultados: number }) {
  useEffect(() => {
    registrarBusca(termo, resultados).catch(() => {});
  }, [termo, resultados]);
  return null;
}
