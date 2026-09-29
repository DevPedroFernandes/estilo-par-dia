import { createClient, type Client } from "@libsql/client";

/**
 * Banco de dados: SQLite via libSQL.
 * - Local: DATABASE_URL=file:catalogo.db (um arquivo na pasta do projeto).
 * - Vercel: DATABASE_URL=libsql://... + DATABASE_AUTH_TOKEN do Turso.
 * O código é o mesmo nos dois casos.
 */

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS produtos (
    sku_pai        TEXT PRIMARY KEY,           -- item_id do ML (ex.: MLB7683834798)
    titulo         TEXT NOT NULL,
    categoria      TEXT NOT NULL DEFAULT '',
    preco          REAL NOT NULL DEFAULT 0,
    cores          TEXT NOT NULL DEFAULT '[]', -- JSON: [{"nome":"Preto","hex":"#000000"}]
    qtd_variacoes  INTEGER NOT NULL DEFAULT 0,
    link_ml        TEXT NOT NULL DEFAULT '',
    imagem         TEXT NOT NULL DEFAULT '',
    imagens        TEXT NOT NULL DEFAULT '[]', -- JSON: URLs sem repetição
    descricao      TEXT NOT NULL DEFAULT '',
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
    tipo        TEXT NOT NULL,              -- 'visita' | 'clique' | 'busca'
    sku         TEXT,                       -- produto (visita e clique)
    termo       TEXT,                       -- texto buscado (busca)
    resultados  INTEGER,                    -- quantos produtos a busca achou
    dispositivo TEXT NOT NULL DEFAULT '',   -- 'celular' | 'computador'
    dia         TEXT NOT NULL,              -- AAAA-MM-DD no horário de Brasília
    momento     INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_eventos_dia ON eventos (dia, tipo)`,
];

/** Colunas adicionadas depois da primeira versão: bancos antigos ganham na hora. */
const COLUNAS_NOVAS: [string, string][] = [
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
}

let cliente: Client | null = null;
let pronto: Promise<void> | null = null;

export async function db(): Promise<Client> {
  if (!cliente) {
    cliente = createClient({
      // Aceita também os nomes TURSO_* que algumas integrações criam sozinhas.
      url: process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || "file:catalogo.db",
      authToken: process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined,
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
