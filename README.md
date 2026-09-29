# Catálogo Estilo Paródia (Next.js)

Vitrine que leva o cliente para comprar no Mercado Livre, com painel admin (dashboard de métricas e cadastro de produtos).

## Rodar no computador

Precisa do Node.js 20.12 ou mais novo (https://nodejs.org, versão LTS).

```powershell
npm install
npm run dev
```

Abra http://localhost:3000. Na primeira vez, o `produtos_ml_completo.csv` da raiz é importado sozinho.

**Área admin:** botão no rodapé do site (ou http://localhost:3000/admin).
Usuário `estiloparodia`, senha `estilo123`. Para trocar, crie um `.env.local`
a partir do `.env.example` e mude `ADMIN_SENHA`.

No painel:
- **Dashboard**: visitas, cliques no ML, taxa de clique, buscas (inclusive as que não acharam nada),
  produtos mais vistos, categorias e aparelho. Filtro de 7, 30 ou 90 dias.
- **Produtos**: importar CSV, filtrar, ativar/desativar, **+ Novo produto** e **Editar**.
  Produtos editados no painel ficam marcados como "Editado" e o CSV não sobrescreve.
- **Banner da home**: no formulário do produto, marque "Destacar no banner" e, se quiser, escreva
  uma frase própria. Sem nenhum marcado, o banner mostra os 4 produtos mais acessados.

## Publicar na Vercel

1. Suba o projeto para um repositório no GitHub (o `.gitignore` já protege `.env.local` e o banco local).
2. Na Vercel: **Add New → Project**, escolha o repositório.
3. Crie um banco grátis no **Turso** (em turso.tech, ou pela aba **Storage** da Vercel → Turso Cloud). No painel do Turso, copie a URL do banco (`libsql://...`) e gere um token.
4. Em **Settings → Environment Variables**, cadastre:
   `ADMIN_USER`, `ADMIN_SENHA` (obrigatório: com a senha padrão o painel fica bloqueado no site publicado),
   `DATABASE_URL` (a URL `libsql://...`), `DATABASE_AUTH_TOKEN`,
   `INSTAGRAM_URL`, `WHATSAPP_NUMERO`, `LOJA_ML_URL`.
   Na Vercel, cole os valores sem aspas.
5. Faça o deploy, entre no painel e envie o CSV em **Importar produtos**.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Roda local (importa o CSV se o banco estiver vazio) |
| `npm run seed -- --forcar` | Reimporta o CSV da raiz no banco configurado |
