CREATE TABLE `eventos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sku_pai` text NOT NULL,
	`tipo` text NOT NULL,
	`ip_hash` text DEFAULT '' NOT NULL,
	`criado_em` text NOT NULL,
	`sku` text,
	`termo` text,
	`resultados` integer,
	`dispositivo` text DEFAULT '' NOT NULL,
	`dia` text DEFAULT '' NOT NULL,
	`momento` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `eventos_criado_em_idx` ON `eventos` (`criado_em`);--> statement-breakpoint
CREATE TABLE `produtos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sku_pai` text NOT NULL,
	`titulo` text NOT NULL,
	`descricao` text DEFAULT '' NOT NULL,
	`categoria` text DEFAULT '' NOT NULL,
	`preco` real DEFAULT 0 NOT NULL,
	`imagem_principal` text DEFAULT '' NOT NULL,
	`imagens` text DEFAULT '[]' NOT NULL,
	`cores` text DEFAULT '[]' NOT NULL,
	`tamanhos` text DEFAULT '[]' NOT NULL,
	`link_ml` text,
	`link_shopee` text,
	`ativo` integer DEFAULT 1 NOT NULL,
	`atualizado_em` text NOT NULL,
	`qtd_variacoes` integer DEFAULT 0 NOT NULL,
	`imagem` text DEFAULT '' NOT NULL,
	`busca` text DEFAULT '' NOT NULL,
	`ordem_csv` integer DEFAULT 0 NOT NULL,
	`visualizacoes` integer DEFAULT 0 NOT NULL,
	`cliques_ml` integer DEFAULT 0 NOT NULL,
	`criado_em` text NOT NULL,
	`origem` text DEFAULT 'csv' NOT NULL,
	`protegido` integer DEFAULT 0 NOT NULL,
	`destaque` integer DEFAULT 0 NOT NULL,
	`frase_destaque` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `produtos_sku_pai_unique` ON `produtos` (`sku_pai`);--> statement-breakpoint
CREATE TABLE `usuarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`usuario` text NOT NULL,
	`senha_hash` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_usuario_unique` ON `usuarios` (`usuario`);--> statement-breakpoint
CREATE TABLE `visitas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rota` text NOT NULL,
	`ip_hash` text NOT NULL,
	`user_agent` text DEFAULT '' NOT NULL,
	`referrer` text DEFAULT '' NOT NULL,
	`criado_em` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `visitas_criado_em_idx` ON `visitas` (`criado_em`);