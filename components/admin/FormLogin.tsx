"use client";

import { useActionState } from "react";
import { entrar } from "@/app/admin/acoes";

export default function FormLogin() {
  const [resultado, acao, enviando] = useActionState(entrar, null);
  const campo =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 outline-none focus:border-marca focus:ring-2 focus:ring-marca/20";

  return (
    <form action={acao} className="space-y-4">
      {resultado?.tipo === "erro" && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{resultado.msg}</div>
      )}
      <div>
        <label htmlFor="usuario" className="mb-1 block text-sm font-medium">Usuário</label>
        <input id="usuario" name="usuario" required autoComplete="username" className={campo} />
      </div>
      <div>
        <label htmlFor="senha" className="mb-1 block text-sm font-medium">Senha</label>
        <input id="senha" name="senha" type="password" required autoComplete="current-password" className={campo} />
      </div>
      <button disabled={enviando}
              className="w-full rounded-lg bg-marca py-2.5 font-semibold text-white hover:bg-marca-escuro disabled:opacity-60">
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
