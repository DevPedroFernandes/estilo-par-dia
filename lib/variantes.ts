import type { Cor } from "./importar";

export const CORES_PADRAO: Cor[] = [
  { nome: "Preto", hex: "#000000" },
  { nome: "Branco", hex: "#FFFFFF" },
  { nome: "Cinza", hex: "#808080" },
  { nome: "Azul", hex: "#0000FF" },
  { nome: "Azul-marinho", hex: "#000080" },
  { nome: "Verde", hex: "#008000" },
  { nome: "Vermelho", hex: "#FF0000" },
  { nome: "Rosa", hex: "#FFC0CB" },
  { nome: "Roxo", hex: "#9333EA" },
  { nome: "Amarelo", hex: "#FACC15" },
  { nome: "Laranja", hex: "#F97316" },
  { nome: "Bege", hex: "#D2B48C" },
  { nome: "Marrom", hex: "#8B4513" },
];

export const TAMANHOS_PADRAO = [
  "PP", "P", "M", "G", "GG", "XG", "XGG", "G1", "G2", "G3",
  "34", "36", "38", "40", "42", "44", "46", "48", "50", "52", "54", "56", "Único",
];

function chave(valor: string): string {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
}

export function normalizarNomeCor(nome: string): string {
  const padrao = CORES_PADRAO.find((cor) => chave(cor.nome) === chave(nome));
  return padrao?.nome ?? nome.trim();
}

export function normalizarTamanho(tamanho: string): string {
  const padrao = TAMANHOS_PADRAO.find((item) => chave(item) === chave(tamanho));
  return padrao ?? tamanho.trim();
}