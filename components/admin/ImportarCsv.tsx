"use client";

import { useActionState } from "react";
import { enviarCsv, recarregar, type Resultado } from "@/app/admin/acoes";

function Aviso({ r }: { r: Resultado }) {
  if (!r) return null;
  return (
    <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${r.tipo === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
      {r.msg}
    </div>
  );
}

/** Upload do CSV + botão de recarregar o último enviado. */
export default function ImportarCsv({ ultimoCsv }: { ultimoCsv: string }) {
  const [resEnvio, acaoEnvio, enviando] = useActionState(enviarCsv, null);
  const [resRecarga, acaoRecarga, recarregando] = useActionState(recarregar, null);
  const ultimo = resRecarga ?? resEnvio;

  return (
    <section className="mt-6 rounded-xl bg-white p-5 shadow-sm">
      <h2 className="font-bold">Importar produtos</h2>
      <p className="mt-1 text-sm text-gray-500">
        Envie o <code>produtos_ml_completo.csv</code> (máx. 4 MB). Produtos existentes são atualizados;
        os que não estiverem no arquivo continuam como estão.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form action={acaoEnvio} className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <input type="file" name="arquivo" accept=".csv,text/csv" required
                 className="flex-1 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-marca-claro file:px-3 file:py-2 file:font-semibold file:text-marca" />
          <button disabled={enviando}
                  className="rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-white hover:bg-marca-escuro disabled:opacity-60">
            {enviando ? "Importando..." : "Enviar CSV"}
          </button>
        </form>
        <form action={acaoRecarga}>
          <button disabled={!ultimoCsv || recarregando} title={ultimoCsv}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold hover:border-marca hover:text-marca disabled:cursor-not-allowed disabled:opacity-50">
            {recarregando ? "Recarregando..." : "Recarregar do último CSV enviado"}
          </button>
        </form>
      </div>
      <Aviso r={ultimo} />
    </section>
  );
}
