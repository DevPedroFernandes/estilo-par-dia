import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  async headers() {
    const noindex = process.env.VERCEL_ENV !== "production" ? "noindex, nofollow" : undefined;
    const baseHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ];
    if (noindex) {
      baseHeaders.unshift({ key: "X-Robots-Tag", value: noindex });
    }

    return [
      {
        source: "/:path*",
        headers: baseHeaders,
      },
      {
        source: "/admin/:path*",
        headers: [
          ...baseHeaders,
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          ...baseHeaders,
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/ir/:path*",
        headers: [
          ...baseHeaders,
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/api/admin/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
      },
    ];
  },
  poweredByHeader: false,
};

export default nextConfig;
