import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

type BancoDrizzle = LibSQLDatabase<typeof schema>;

/**
 * Banco de dados: SQLite via libSQL.
 * - Local: DATABASE_URL=file:catalogo.db (um arquivo na pasta do projeto).
 * - Vercel: DATABASE_URL=libsql://... + DATABASE_AUTH_TOKEN do Turso.
 * O código é o mesmo nos dois casos.
 */

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS produtos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    sku_pai        TEXT NOT NULL UNIQUE,
    titulo         TEXT NOT NULL,
    descricao      TEXT NOT NULL DEFAULT '',
    categoria      TEXT NOT NULL DEFAULT '',
    preco          REAL NOT NULL DEFAULT 0,
    imagem_principal TEXT NOT NULL DEFAULT '',
    tamanhos       TEXT NOT NULL DEFAULT '[]',
    link_shopee    TEXT,
    cores          TEXT NOT NULL DEFAULT '[]', -- JSON: [{"nome":"Preto","hex":"#000000"}]
    qtd_variacoes  INTEGER NOT NULL DEFAULT 0,
    link_ml        TEXT,
    imagem         TEXT NOT NULL DEFAULT '',
    imagens        TEXT NOT NULL DEFAULT '[]', -- JSON: URLs sem repetição
    busca          TEXT NOT NULL DEFAULT '',   -- título + categoria sem acento
    ordem_csv      INTEGER NOT NULL DEFAULT 0,
    ativo          INTEGER NOT NULL DEFAULT 1,
    visualizacoes  INTEGER NOT NULL DEFAULT 0,
    cliques_ml     INTEGER NOT NULL DEFAULT 0,
    criado_em      TEXT NOT NULL,
    atualizado_em  TEXT NOT NULL,
    origem         TEXT NOT NULL DEFAULT 'csv', -- 'csv' ou 'manual'
    protegido      INTEGER NOT NULL DEFAULT 0,  -- 1 = editado no painel; o CSV não sobrescreve
    destaque       INTEGER NOT NULL DEFAULT 0,  -- 1 = aparece no banner da home
    frase_destaque TEXT NOT NULL DEFAULT ''     -- frase própria do banner (opcional)
  )`,
  `CREATE TABLE IF NOT EXISTS config (chave TEXT PRIMARY KEY, valor TEXT NOT NULL)`,
  // Tentativas de login com falha. Na Vercel cada requisição pode cair numa
  // instância diferente, então o limite precisa ficar no banco, não na memória.
  `CREATE TABLE IF NOT EXISTS login_falhas (ip TEXT NOT NULL, momento INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_login_falhas ON login_falhas (ip, momento)`,
  // Eventos para o dashboard: uma linha por visita, clique no ML ou busca.
  // Não guardamos IP nem nada que identifique o visitante.
  `CREATE TABLE IF NOT EXISTS eventos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sku_pai     TEXT NOT NULL DEFAULT '',
    tipo        TEXT NOT NULL,
    ip_hash     TEXT NOT NULL DEFAULT '',
    criado_em   TEXT NOT NULL DEFAULT '',
    sku         TEXT,                       -- produto (visita e clique)
    termo       TEXT,                       -- texto buscado (busca)
    resultados  INTEGER,                    -- quantos produtos a busca achou
    dispositivo TEXT NOT NULL DEFAULT '',   -- 'celular' | 'computador'
    dia         TEXT NOT NULL,              -- AAAA-MM-DD no horário de Brasília
    momento     INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_eventos_dia ON eventos (dia, tipo)`,
  `CREATE TABLE IF NOT EXISTS visitas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rota TEXT NOT NULL,
    ip_hash TEXT NOT NULL,
    user_agent TEXT NOT NULL DEFAULT '',
    referrer TEXT NOT NULL DEFAULT '',
    criado_em TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_visitas_criado_em ON visitas (criado_em)`,
  `CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL
  )`,
];

/** Colunas adicionadas depois da primeira versão: bancos antigos ganham na hora. */
const COLUNAS_NOVAS: [string, string][] = [
  ["id", "INTEGER"],
  ["descricao", "TEXT NOT NULL DEFAULT ''"],
  ["imagem_principal", "TEXT NOT NULL DEFAULT ''"],
  ["tamanhos", "TEXT NOT NULL DEFAULT '[]'"],
  ["link_shopee", "TEXT"],
  ["origem", "TEXT NOT NULL DEFAULT 'csv'"],
  ["protegido", "INTEGER NOT NULL DEFAULT 0"],
  ["destaque", "INTEGER NOT NULL DEFAULT 0"],
  ["frase_destaque", "TEXT NOT NULL DEFAULT ''"],
];

async function migrar(c: Client): Promise<void> {
  await c.batch(SCHEMA, "write");
  const existentes = new Set(
    (await c.execute("PRAGMA table_info(produtos)")).rows.map((r) => r.name as string),
  );
  for (const [nome, tipo] of COLUNAS_NOVAS) {
    if (!existentes.has(nome)) await c.execute(`ALTER TABLE produtos ADD COLUMN ${nome} ${tipo}`);
  }
  await c.execute("UPDATE produtos SET id = rowid WHERE id IS NULL");
  await c.execute("UPDATE produtos SET imagem_principal = imagem WHERE imagem_principal = '' AND imagem <> ''");

  const eventosExistentes = new Set(
    (await c.execute("PRAGMA table_info(eventos)")).rows.map((r) => r.name as string),
  );
  for (const [nome, tipo] of [
    ["sku_pai", "TEXT NOT NULL DEFAULT ''"],
    ["ip_hash", "TEXT NOT NULL DEFAULT ''"],
    ["criado_em", "TEXT NOT NULL DEFAULT ''"],
  ]) {
    if (!eventosExistentes.has(nome)) await c.execute(`ALTER TABLE eventos ADD COLUMN ${nome} ${tipo}`);
  }
}

let cliente: Client | null = null;
let clienteDrizzle: BancoDrizzle | null = null;
let pronto: Promise<void> | null = null;

export async function db(): Promise<Client> {
  if (!cliente) {
    const preview = process.env.VERCEL_ENV === "preview";
    const urlConfigurada = preview
      ? process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL
      : process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
    const url = urlConfigurada || (process.env.NODE_ENV === "production" ? "" : "file:catalogo.db");
    if (!url) throw new Error("DATABASE_URL é obrigatório em produção.");
    cliente = createClient({
      // Aceita também os nomes TURSO_* que algumas integrações criam sozinhas.
      url,
      authToken: (preview
        ? process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN
        : process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN) || undefined,
    });
  }
  if (!pronto) {
    // Cria as tabelas uma vez por processo.
    pronto = migrar(cliente);
    pronto.catch(() => (pronto = null));
  }
  await pronto;
  return cliente;
}

export async function drizzleDb(): Promise<BancoDrizzle> {
  const client = await db();
  clienteDrizzle ??= drizzle(client, { schema });
  return clienteDrizzle;
}

export async function getConfig(chave: string): Promise<string> {
  const c = await db();
  const r = await c.execute({ sql: "SELECT valor FROM config WHERE chave = ?", args: [chave] });
  return (r.rows[0]?.valor as string) ?? "";
}

export async function setConfig(chave: string, valor: string): Promise<void> {
  const c = await db();
  await c.execute({
    sql: `INSERT INTO config (chave, valor) VALUES (?, ?)
          ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`,
    args: [chave, valor],
  });
}
