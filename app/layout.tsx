import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Estilo Paródia",
  description: "Camisetas e vestidos com estampas de paródia.",
  // <meta name="robots" content="noindex, nofollow"> em todas as páginas
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
