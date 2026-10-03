# Deploy de teste: Vercel + Turso

O deploy Preview pode ser feito diretamente do workspace pela CLI da Vercel; não exige commit nem push. O projeto usa Next.js com configuração zero, Turso para os dados e Vercel Blob para uploads em produção.

## 1. Criar a base Turso

No painel do Turso, crie uma base para teste e gere um token de acesso. Guarde a URL `libsql://...` e o token; não os coloque no Git nem no chat.

## 2. Ligar o projeto à Vercel

Na raiz do projeto, autentique e associe o workspace a um projeto Vercel:

```powershell
npm exec --yes --package=vercel -- vercel login
npm exec --yes --package=vercel -- vercel link
```

O Blob Store `estilo-parodia-preview-imagens` já está conectado somente ao Preview via OIDC; a integração disponibiliza `BLOB_STORE_ID`. Para outro projeto, crie um Blob Store e conecte-o ao ambiente Preview. Um token estático `BLOB_READ_WRITE_TOKEN` também é aceito, mas não é necessário nessa configuração.

## 3. Configurar variáveis de Preview

Em **Project Settings > Environment Variables**, adicione estas variáveis ao ambiente **Preview**:

| Variável | Valor |
| --- | --- |
| `TURSO_DATABASE_URL` | Criada pela conexão Turso do ambiente Preview |
| `TURSO_AUTH_TOKEN` | Criada pela conexão Turso do ambiente Preview |
| `DATABASE_URL` | URL Turso usada em Production |
| `DATABASE_AUTH_TOKEN` | Token Turso usado em Production |
| `ADMIN_USER` | Utilizador exclusivo para o painel de teste |
| `ADMIN_SENHA` | Senha forte exclusiva para o painel de teste |
| `AUTH_SECRET` | Segredo aleatório com pelo menos 32 caracteres |
| `IP_HASH_SECRET` | Outro segredo aleatório, diferente do `AUTH_SECRET` |
| `SECRET_KEY` | Segredo aleatório para assinar a sessão |
| `BLOB_STORE_ID` | Criado automaticamente ao conectar o Blob Store ao Preview |

`INSTAGRAM_URL`, `WHATSAPP_NUMERO` e `LOJA_ML_URL` são opcionais. Não use `DATABASE_URL=file:catalogo.db` na Vercel: o disco das Functions não é persistente.

## 4. Importar os produtos no Turso

Use `vercel env run` para injetar as variáveis secretas apenas no processo. Defina `VERCEL_ENV=preview` para garantir que o seed use `TURSO_*`, e não as variáveis de Production:

```powershell
$env:VERCEL_ENV = 'preview'
npm exec --yes --package=vercel -- vercel env run --environment preview -- npm run seed -- --forcar
Remove-Item Env:VERCEL_ENV
```

O seed inicializa o schema e importa o CSV sem gravar segredos em arquivos locais.

## 5. Publicar um Preview

Envie o workspace atual diretamente para a Vercel sem publicar em produção:

```powershell
npm exec --yes --package=vercel -- vercel deploy
```

A CLI retorna a URL Preview. O projeto aplica `noindex, nofollow` às respostas, adequado ao ambiente de teste. Não use `vercel deploy --prod` nesta etapa.