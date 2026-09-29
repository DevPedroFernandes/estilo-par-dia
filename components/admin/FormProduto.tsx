"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { excluirProduto, salvarProduto, type Valores } from "@/app/admin/produtos/acoes";

const campo =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-marca focus:ring-2 focus:ring-marca/20";
const rotulo = "mb-1 block text-sm font-semibold text-gray-700";
const ajuda = "mt-1 text-xs text-gray-500";

type Props = {
  sku?: string; // presente = edição
  inicial: Valores;
  categorias: string[];
  origem?: string;
};

export default function FormProduto({ sku, inicial, categorias, origem }: Props) {
  const [estado, acao, salvando] = useActionState(salvarProduto, null);
  const v = estado?.valores ?? inicial;
  const [fotos, setFotos] = useState(v.imagens);
  const listaFotos = fotos.split(/\s+/).filter((u) => /^https:\/\//i.test(u)).slice(0, 12);
  return (
    <div className="space-y-6">
      {estado?.erro && (
        <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{estado.erro}</div>
      )}

      <form action={acao} className="space-y-6">
        {sku && <input type="hidden" name="sku_original" value={sku} />}

        <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">Informações</h2>
          <div>
            <label htmlFor="titulo" className={rotulo}>Título *</label>
            <input id="titulo" name="titulo" required maxLength={150} defaultValue={v.titulo}
                   placeholder="Camiseta Feminina Estilo Paródia ..." className={campo} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="categoria" className={rotulo}>Categoria *</label>
              <input id="categoria" name="categoria" required list="lista-categorias" maxLength={60}
                     defaultValue={v.categoria} className={campo} />
              <datalist id="lista-categorias">
                {categorias.map((c) => <option key={c} value={c} />)}
              </datalist>
              <p className={ajuda}>Escolha uma existente ou digite uma nova.</p>
            </div>
            <div>
              <label htmlFor="preco" className={rotulo}>Preço (R$) *</label>
              <input id="preco" name="preco" required inputMode="decimal" defaultValue={v.preco}
                     placeholder="89,90" className={campo} />
            </div>
          </div>
          <div>
            <label htmlFor="link_ml" className={rotulo}>Link do anúncio no Mercado Livre *</label>
            <input id="link_ml" name="link_ml" type="url" required defaultValue={v.link_ml}
                   placeholder="https://produto.mercadolivre.com.br/MLB-..." className={campo} />
            {sku && <p className={ajuda}>Código do produto: <span className="font-mono">{sku}</span></p>}
          </div>
        </section>

        <section className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">Fotos *</h2>
          <textarea name="imagens" required rows={4} value={fotos} onChange={(e) => setFotos(e.target.value)}
                    placeholder={"https://http2.mlstatic.com/....webp\nhttps://..."}
                    className={`${campo} font-mono text-xs`} />
          <p className={ajuda}>
            Um link por linha; a primeira é a foto principal. No anúncio do ML, clique com o botão direito
            na foto e escolha “Copiar endereço da imagem”.
          </p>
          {listaFotos.length > 0 && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {listaFotos.map((u, i) => (
                <div key={u + i} className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-gray-100 ${i === 0 ? "border-marca" : "border-transparent"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                  {i === 0 && <span className="absolute left-1 top-1 rounded bg-marca px-1.5 text-[10px] font-bold text-white">Principal</span>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
          <label htmlFor="descricao" className="font-bold">Descrição</label>
          <textarea id="descricao" name="descricao" rows={7} defaultValue={v.descricao} className={campo} />
          <p className={ajuda}>Deixe um parágrafo em branco entre blocos. Se ficar vazia, entra um texto padrão.</p>
        </section>

        <section className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="ativo" defaultChecked={v.ativo} className="h-4 w-4 accent-marca" />
            <span><strong>Ativo</strong>: aparece na vitrine</span>
          </label>
          {sku && origem !== "manual" && (
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" name="protegido" defaultChecked={v.protegido} className="h-4 w-4 accent-marca" />
              <span><strong>Manter minhas alterações</strong> quando o CSV for importado de novo</span>
            </label>
          )}
          {(!sku || origem === "manual") && <input type="hidden" name="protegido" value="on" />}
        </section>

        <section className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">Banner da home</h2>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="destaque" defaultChecked={v.destaque} className="h-4 w-4 accent-marca" />
            <span><strong>Destacar no banner</strong> do topo da página inicial</span>
          </label>
          <div>
            <label htmlFor="frase_destaque" className={rotulo}>Frase do banner (opcional)</label>
            <input id="frase_destaque" name="frase_destaque" maxLength={60} defaultValue={v.frase_destaque}
                   placeholder="Ex.: O clássico que virou assunto." className={campo} />
            <p className={ajuda}>
              Até 60 caracteres. Em branco, usamos uma das nossas frases prontas. Sem nenhum produto
              marcado, o banner mostra os 4 mais acessados.
            </p>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button disabled={salvando}
                  className="rounded-lg bg-marca px-5 py-2.5 font-semibold text-white hover:bg-marca-escuro disabled:opacity-60">
            {salvando ? "Salvando..." : sku ? "Salvar alterações" : "Cadastrar produto"}
          </button>
          <Link href="/admin/produtos" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100">
            Cancelar
          </Link>
        </div>
      </form>

      {sku && (
        <form
          action={excluirProduto}
          onSubmit={(e) => {
            const aviso = origem === "manual"
              ? "Excluir este produto? Não dá para desfazer."
              : "Excluir este produto? Se ele estiver no CSV, volta na próxima importação. Para só esconder, use Inativo.";
            if (!confirm(aviso)) e.preventDefault();
          }}
          className="border-t border-gray-200 pt-6"
        >
          <input type="hidden" name="sku" value={sku} />
          <button className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
            Excluir produto
          </button>
        </form>
      )}
    </div>
  );
}
