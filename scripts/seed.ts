/**
 * Importa o produtos_ml_completo.csv da raiz do projeto para o banco.
 *   npm run seed            -> só importa se o banco estiver vazio
 *   npm run seed -- --forcar -> importa mesmo com produtos (UPSERT, não duplica)
 * Roda sozinho antes do "npm run dev" (script predev).
 */
import { existsSync, readFileSync } from "node:fs";

for (const arq of [".env.preview.local", ".env.local", ".env"]) {
  if (existsSync(arq)) process.loadEnvFile(arq);
}

async function main() {
  const { db, setConfig } = await import("../lib/db");
  const { importarCsv, agoraIso } = await import("../lib/importar");

  const csv = "produtos_ml_completo.csv";
  const c = await db();
  const total = Number((await c.execute("SELECT COUNT(*) AS n FROM produtos")).rows[0].n);
  if (total > 0 && !process.argv.includes("--forcar")) {
    console.log(`Banco já tem ${total} produtos. Nada a importar.`);
    return;
  }
  if (!existsSync(csv)) {
    console.log(`Arquivo ${csv} não encontrado na raiz. Importe pelo painel.`);
    return;
  }
  const conteudo = readFileSync(csv, "utf8");
  const { criados, novos, atualizados, erros, detalhesErros } = await importarCsv(conteudo);
  await setConfig("ultimo_csv", conteudo);
  await setConfig("ultimo_csv_nome", `${csv} (${agoraIso().slice(0, 16).replace("T", " ")})`);
  console.log(`Relatório: ${criados} criados, ${atualizados} atualizados, ${erros} erros.`);
  for (const detalhe of detalhesErros) console.warn(detalhe);
  if (!criados && !novos && !atualizados && erros) process.exitCode = 1;
}

main().catch((e) => {
  console.error("Erro na importação:", e.message);
  process.exit(1);
});
