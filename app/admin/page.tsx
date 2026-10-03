import { redirect } from "next/navigation";
import FormLogin from "@/components/admin/FormLogin";
import { estaLogado } from "@/lib/auth";

export const metadata = {
  title: "Área admin · Estilo Paródia",
  robots: { index: false, follow: false },
};

/** Tela de login do painel. */
export default async function Login() {
  if (await estaLogado()) redirect("/admin/painel");

  return (
    <main className="mx-auto mt-16 w-full max-w-sm px-4">
      <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
        <p className="text-center text-xl font-extrabold text-marca">Estilo Paródia</p>
        <p className="mb-6 text-center text-sm text-gray-500">Área admin</p>
        <FormLogin />
      </div>
      <p className="mt-4 text-center text-sm">
        <a href="/" className="text-gray-500 hover:text-marca">← Voltar ao site</a>
      </p>
    </main>
  );
}
