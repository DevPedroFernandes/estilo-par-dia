import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Actions aceitam até 1 MB por padrão. O CSV tem ~330 KB, mas deixamos
  // folga. Não adianta subir muito: a Vercel limita o corpo da requisição a 4,5 MB.
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  // Cabeçalhos de segurança em todas as respostas.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  poweredByHeader: false,
};

export default nextConfig;
