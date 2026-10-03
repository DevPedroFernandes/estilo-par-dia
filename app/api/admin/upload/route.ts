import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { estaLogado } from "@/lib/auth";

const TAMANHO_MAXIMO = 4 * 1024 * 1024;
const TIPOS = {
  "image/jpeg": { extensao: "jpg", assinatura: [0xff, 0xd8, 0xff] },
  "image/png": { extensao: "png", assinatura: [0x89, 0x50, 0x4e, 0x47] },
  "image/webp": { extensao: "webp", assinatura: [0x52, 0x49, 0x46, 0x46] },
} as const;

export async function POST(request: Request) {
  if (!(await estaLogado())) return Response.json({ erro: "Não autenticado." }, { status: 401 });

  const origem = request.headers.get("origin");
  if (!origem || new URL(origem).origin !== new URL(request.url).origin) {
    return Response.json({ erro: "Origem inválida." }, { status: 403 });
  }

  let arquivo: FormDataEntryValue | null;
  try {
    arquivo = (await request.formData()).get("arquivo");
  } catch {
    return Response.json({ erro: "Não foi possível ler o arquivo enviado." }, { status: 400 });
  }
  if (!(arquivo instanceof File) || !arquivo.size) {
    return Response.json({ erro: "Selecione uma imagem." }, { status: 400 });
  }
  if (arquivo.size > TAMANHO_MAXIMO) {
    return Response.json({ erro: "Cada imagem pode ter no máximo 4 MB." }, { status: 413 });
  }

  const tipo = TIPOS[arquivo.type as keyof typeof TIPOS];
  if (!tipo) {
    return Response.json({ erro: "Formato inválido. Envie JPEG, PNG ou WebP." }, { status: 415 });
  }
  const conteudo = Buffer.from(await arquivo.arrayBuffer());
  const assinaturaCorreta = tipo.assinatura.every((byte, indice) => conteudo[indice] === byte);
  const webpCorreto = arquivo.type !== "image/webp" || conteudo.toString("ascii", 8, 12) === "WEBP";
  if (!assinaturaCorreta || !webpCorreto) {
    return Response.json({ erro: "O conteúdo do arquivo não corresponde ao formato da imagem." }, { status: 415 });
  }

  const nome = `${randomUUID()}.${tipo.extensao}`;
  try {
    if (process.env.NODE_ENV === "production") {
      if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
        return Response.json({ erro: "Conecte um Blob Store ou configure BLOB_READ_WRITE_TOKEN." }, { status: 503 });
      }
      const blob = await put(`produtos/${nome}`, arquivo, {
        access: "public",
        addRandomSuffix: false,
        contentType: arquivo.type,
        storeId: process.env.BLOB_STORE_ID,
      });
      return Response.json({ url: blob.url }, { status: 201 });
    }

    const pasta = path.join(process.cwd(), "public", "uploads");
    await mkdir(pasta, { recursive: true });
    await writeFile(path.join(pasta, nome), conteudo, { flag: "wx" });
    return Response.json({ url: `/uploads/${nome}` }, { status: 201 });
  } catch (erro) {
    console.error("Falha no upload de imagem:", erro);
    return Response.json({ erro: "Não foi possível armazenar a imagem." }, { status: 500 });
  }
}