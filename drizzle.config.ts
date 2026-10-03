import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Lê .env, .env.local etc. com as mesmas regras do Next.js.
loadEnvConfig(process.cwd());

/**
 * CLI do Drizzle.
 *  - npm run db:generate  → gera um novo arquivo SQL em ./drizzle a partir do lib/schema.ts
 *  - npm run db:migrate   → aplica as migrações pendentes no banco configurado
 *  - npm run db:studio    → abre o Drizzle Studio no navegador
 *
 * Sem DATABASE_URL, usa o arquivo local catalogo.db. Com DATABASE_URL=libsql://...
 * e DATABASE_AUTH_TOKEN, fala diretamente com o Turso.
 */
export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL?.trim() || "file:catalogo.db",
    authToken: process.env.DATABASE_AUTH_TOKEN?.trim() || undefined,
  },
  strict: true,
  verbose: true,
});
