import { createHmac } from "node:crypto";
import { isIP } from "node:net";

const TAMANHO_MINIMO = 32;
const PREFIXOS_PLACEHOLDER = ["substitua-por", "use-outro"];

export function segredoAmbiente(nome: string): string | null {
  const valor = process.env[nome]?.trim() ?? "";
  if (!valor) return null;
  if (process.env.NODE_ENV === "production" && (valor.length < TAMANHO_MINIMO || PREFIXOS_PLACEHOLDER.some((prefixo) => valor.toLowerCase().startsWith(prefixo)))) {
    throw new Error(`Variável ${nome} inválida em produção.`);
  }
  return valor;
}

export function hashIp(ip: string, contexto: "analytics" | "login"): string | null {
  const segredo = segredoAmbiente("IP_HASH_SECRET");
  if (!segredo || !ip || !isIP(ip)) return null;
  return createHmac("sha256", segredo).update(`${contexto}:${ip}`).digest("hex");
}

export function segredoSessao(): string {
  const valor = segredoAmbiente("SECRET_KEY");
  if (process.env.NODE_ENV === "production") {
    if (!valor) throw new Error("SECRET_KEY ausente em produção.");
    return valor;
  }
  return valor ?? "dev-secret-session-key-valor-fixo";
}
