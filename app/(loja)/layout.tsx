import Link from "next/link";

// Links do rodapé vêm do ambiente. Os provisórios devem ser trocados no .env.local / Vercel.
const INSTAGRAM_URL = process.env.INSTAGRAM_URL || "https://instagram.com/lorem-ipsum";
const WHATSAPP_NUMERO = (process.env.WHATSAPP_NUMERO || "5500000000000").replace(/\D/g, "");
const LOJA_ML_URL = process.env.LOJA_ML_URL || "https://lista.mercadolivre.com.br/_CustId_3394140237";

export default function LojaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}

      <footer className="mt-8 border-t border-gray-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="font-bold text-marca">Estilo Paródia</Link>
            <p className="text-sm text-gray-500">Camisetas e vestidos com estampas de paródia.</p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <a href={LOJA_ML_URL} target="_blank" rel="noopener"
               className="rounded-full bg-ml px-4 py-2 font-semibold text-gray-900 hover:bg-ml-escuro">
              Loja no Mercado Livre
            </a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener"
               className="rounded-full border border-gray-200 px-4 py-2 font-semibold hover:border-marca hover:text-marca">
              Instagram
            </a>
            <a href={`https://wa.me/${WHATSAPP_NUMERO}`} target="_blank" rel="noopener"
               className="rounded-full border border-gray-200 px-4 py-2 font-semibold hover:border-marca hover:text-marca">
              WhatsApp
            </a>
          </nav>
        </div>
        <div className="flex items-center justify-center gap-3 pb-6 text-xs text-gray-400">
          <span>© {new Date().getFullYear()} Estilo Paródia</span>
          <span aria-hidden>·</span>
          <Link href="/admin" className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-500 hover:border-marca hover:text-marca">
            Área admin
          </Link>
        </div>
      </footer>
    </>
  );
}
