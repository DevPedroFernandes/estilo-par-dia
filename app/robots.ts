import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", disallow: ["/admin", "/ir", "/api"] },
    ],
    sitemap: ["https://estilo-parodia.com/sitemap.xml"],
  };
}
