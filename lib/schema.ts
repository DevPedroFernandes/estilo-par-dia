import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const produtos = sqliteTable(
  "produtos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sku_pai: text("sku_pai").notNull(),
    titulo: text("titulo").notNull(),
    descricao: text("descricao").notNull().default(""),
    categoria: text("categoria").notNull().default(""),
    preco: real("preco").notNull().default(0),
    imagem_principal: text("imagem_principal").notNull().default(""),
    imagens: text("imagens", { mode: "json" }).$type<string[]>().notNull().default([]),
    cores: text("cores", { mode: "json" }).$type<{ nome: string; hex: string }[]>().notNull().default([]),
    tamanhos: text("tamanhos", { mode: "json" }).$type<string[]>().notNull().default([]),
    link_ml: text("link_ml"),
    link_shopee: text("link_shopee"),
    ativo: integer("ativo").notNull().default(1),
    atualizado_em: text("atualizado_em").notNull().$defaultFn(() => new Date().toISOString()),
    qtd_variacoes: integer("qtd_variacoes").notNull().default(0),
    imagem: text("imagem").notNull().default(""),
    busca: text("busca").notNull().default(""),
    ordem_csv: integer("ordem_csv").notNull().default(0),
    visualizacoes: integer("visualizacoes").notNull().default(0),
    cliques_ml: integer("cliques_ml").notNull().default(0),
    criado_em: text("criado_em").notNull().$defaultFn(() => new Date().toISOString()),
    origem: text("origem").notNull().default("csv"),
    protegido: integer("protegido").notNull().default(0),
    destaque: integer("destaque").notNull().default(0),
    frase_destaque: text("frase_destaque").notNull().default(""),
  },
  (table) => [uniqueIndex("produtos_sku_pai_unique").on(table.sku_pai)],
);

export const visitas = sqliteTable(
  "visitas",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    rota: text("rota").notNull(),
    ip_hash: text("ip_hash").notNull(),
    user_agent: text("user_agent").notNull().default(""),
    referrer: text("referrer").notNull().default(""),
    criado_em: text("criado_em").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => [index("visitas_criado_em_idx").on(table.criado_em)],
);

export const config = sqliteTable("config", {
  chave: text("chave").primaryKey(),
  valor: text("valor").notNull(),
});

export const loginFalhas = sqliteTable(
  "login_falhas",
  {
    ip: text("ip").notNull(),
    momento: integer("momento").notNull(),
  },
  (table) => [index("idx_login_falhas").on(table.ip, table.momento)],
);

export const eventos = sqliteTable(
  "eventos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sku_pai: text("sku_pai").notNull(),
    tipo: text("tipo").$type<"clique_ml" | "clique_shopee" | "visita" | "clique" | "busca">().notNull(),
    ip_hash: text("ip_hash").notNull().default(""),
    criado_em: text("criado_em").notNull().$defaultFn(() => new Date().toISOString()),
    sku: text("sku"),
    termo: text("termo"),
    resultados: integer("resultados"),
    dispositivo: text("dispositivo").notNull().default(""),
    dia: text("dia").notNull().default(""),
    momento: integer("momento").notNull().default(0),
  },
  (table) => [
    index("eventos_criado_em_idx").on(table.criado_em),
    index("idx_eventos_sku_tipo_dia").on(table.sku, table.tipo, table.dia),
    index("idx_eventos_momento").on(table.momento),
  ],
);

export const usuarios = sqliteTable("usuarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  usuario: text("usuario").notNull().unique(),
  senha_hash: text("senha_hash").notNull(),
});

export type Produto = typeof produtos.$inferSelect;
export type NovoProduto = typeof produtos.$inferInsert;
export type Visita = typeof visitas.$inferSelect;
export type Evento = typeof eventos.$inferSelect;
export type Usuario = typeof usuarios.$inferSelect;