import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { segredoSessao } from "./seguranca";

/**
 * Autenticação do painel (/admin) — versão simplificada.
 * - Usuário e senha vêm das variáveis ADMIN_USER e ADMIN_SENHA. Sem elas, vale
 *   o padrão abaixo, que só funciona no computador: com o site publicado
 *   (produção), o painel fica bloqueado até a senha padrão ser trocada.
 * - Sessão em cookie assinado com HMAC (HttpOnly, SameSite=Lax, Secure em produção).
 *   A chave da assinatura deriva da senha: trocar a senha desloga todo mundo.
 * - CSRF: os formulários do painel usam Server Actions, que o Next.js só aceita
 *   quando o Origin da requisição bate com o domínio do site.
 * - Limite de 5 tentativas erradas em 5 minutos por IP (no banco).
 */

export const USUARIO_PADRAO = "estiloparodia";
export const SENHA_PADRAO = "estilo123";

function usuario(): string {
  return (process.env.ADMIN_USER ?? "").trim() || (process.env.NODE_ENV === "production" ? "" : USUARIO_PADRAO);
}

function senha(): string {
  return (process.env.ADMIN_SENHA ?? "").trim() || (process.env.NODE_ENV === "production" ? "" : SENHA_PADRAO);
}

/** No site publicado, a senha padrão não pode ser usada. */
export function senhaPadraoEmProducao(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  return !usuario() || !senha() || senha() === SENHA_PADRAO;
}

function iguais(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function credenciaisConferem(u: string, s: string): boolean {
  const usuarioOk = iguais(u, usuario());
  const senhaOk = iguais(s, senha());
  return usuarioOk && senhaOk;
}

// ---------------------------------------------------------------------------
// Sessão
// ---------------------------------------------------------------------------

const COOKIE = "ep_sessao";
const DURACAO_S = 12 * 60 * 60;

function assinar(valor: string): string {
  const chave = createHash("sha256").update(`${segredoSessao()}`).digest();
  return createHmac("sha256", chave).update(valor).digest("base64url");
}

export async function criarSessao(): Promise<void> {
  const expira = Math.floor(Date.now() / 1000) + DURACAO_S;
  const valor = `admin.${expira}`;
  (await cookies()).set(COOKIE, `${valor}.${assinar(valor)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_S,
  });
}

export async function encerrarSessao(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function estaLogado(): Promise<boolean> {
  const bruto = (await cookies()).get(COOKIE)?.value ?? "";
  const [papel, expira, assinatura] = bruto.split(".");
  if (papel !== "admin" || !expira || !assinatura) return false;
  const esperado = Buffer.from(assinar(`${papel}.${expira}`));
  const recebido = Buffer.from(assinatura);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return false;
  return Number(expira) > Date.now() / 1000;
}

/** Equivalente ao @login_required: sem sessão, volta para a tela de login. */
export async function exigirLogin(): Promise<void> {
  if (!(await estaLogado())) redirect("/admin");
}

// ---------------------------------------------------------------------------
// Rate limit: 5 falhas em 5 minutos por IP (guardado no banco)
// ---------------------------------------------------------------------------

export async function ipCliente(): Promise<string> {
  const h = await headers();
  const ambiente = process.env.TRUSTED_PROXY ?? "";
  const vercel = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);

  if (process.env.NODE_ENV !== "production") return "local";

  if (vercel) {
    const candidato = h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? "";
    if (isIP(candidato)) return candidato;
    console.warn("ipCliente: x-vercel-forwarded-for ausente em produção.");
    return "unknown";
  }

  if (ambiente === "cloudflare") {
    const candidato = h.get("cf-connecting-ip")?.trim() ?? "";
    if (isIP(candidato)) return candidato;
  }

  if (ambiente === "xff") {
    const candidato = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    if (isIP(candidato)) return candidato;
  }

  if (ambiente === "vercel") {
    const candidato = h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? "";
    if (isIP(candidato)) return candidato;
  }

  console.warn("ipCliente: proxy não confiável em produção; aplicando limite global.");
  return "unknown";
}

