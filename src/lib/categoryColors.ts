import type { Category } from "./types";

type CategoryColor = {
  accent: string;
  border: string;
  chipBg: string;
  chipText: string;
  sectionBg: string;
  softBg: string;
  text: string;
};

const NAMED_COLORS: Record<string, CategoryColor> = {
  hortifruti: makeColor("emerald"),
  padaria: makeColor("amber"),
  carnes: makeColor("rose"),
  "frios e laticinios": makeColor("sky"),
  mercearia: makeColor("violet"),
  bebidas: makeColor("cyan"),
  higiene: makeColor("indigo"),
  limpeza: makeColor("teal"),
  pet: makeColor("orange"),
  outros: makeColor("slate"),
};

const PALETTE = [
  makeColor("emerald"),
  makeColor("amber"),
  makeColor("rose"),
  makeColor("sky"),
  makeColor("violet"),
  makeColor("cyan"),
  makeColor("indigo"),
  makeColor("teal"),
  makeColor("orange"),
  makeColor("lime"),
  makeColor("fuchsia"),
  makeColor("blue"),
  makeColor("pink"),
  makeColor("purple"),
];

export function getCategoryColor(category: Category): CategoryColor {
  const key = normalizeCategory(category);
  return NAMED_COLORS[key] ?? PALETTE[getHashIndex(key, PALETTE.length)] ?? makeColor("slate");
}

function makeColor(name: string): CategoryColor {
  return {
    accent: `bg-${name}-500`,
    border: `border-${name}-200`,
    chipBg: `bg-${name}-100`,
    chipText: `text-${name}-700`,
    sectionBg: `bg-${name}-50/40`,
    softBg: `bg-${name}-50`,
    text: `text-${name}-700`,
  };
}

function normalizeCategory(category: Category) {
  return category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getHashIndex(value: string, length: number) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash % length;
}
