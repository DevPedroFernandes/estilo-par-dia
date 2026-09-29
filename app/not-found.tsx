import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-20 text-center">
      <p className="text-5xl font-extrabold text-marca">404</p>
      <p className="mt-3 text-gray-600">Não encontramos essa página.</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-marca px-6 py-2.5 font-semibold text-white hover:bg-marca-escuro">
        Ver produtos
      </Link>
    </main>
  );
}
