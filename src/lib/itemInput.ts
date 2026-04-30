import type { Category } from "./types";

export const UNIT_OPTIONS = ["kg", "g", "l", "ml", "m", "pct", "gar", "cx", "sc", "un", "dz", "fd"];

type ItemDefaults = {
  category: Category;
  unit: string;
};

const CATEGORY_KEYWORDS: Array<{ category: Category; words: string[] }> = [
  {
    category: "Hortifruti",
    words: [
      "abacate",
      "abacaxi",
      "alface",
      "alho",
      "banana",
      "batata",
      "beterraba",
      "cebola",
      "cenoura",
      "laranja",
      "limao",
      "maca",
      "mamao",
      "manga",
      "tomate",
      "uva",
    ],
  },
  { category: "Padaria", words: ["biscoito", "bolo", "broa", "pao", "torrada"] },
  {
    category: "Carnes",
    words: ["acem", "bife", "carne", "costela", "frango", "linguica", "peixe", "pernil", "patinho"],
  },
  {
    category: "Frios e Laticínios",
    words: ["iogurte", "leite", "manteiga", "margarina", "mucarela", "mussarela", "presunto", "queijo", "requeijao"],
  },
  {
    category: "Mercearia",
    words: ["acucar", "arroz", "azeite", "cafe", "farinha", "feijao", "macarrao", "molho", "oleo", "sal"],
  },
  {
    category: "Higiene",
    words: ["absorvente", "condicionador", "creme dental", "desodorante", "papel higienico", "sabonete", "shampoo"],
  },
  {
    category: "Limpeza",
    words: ["agua sanitaria", "amaciante", "detergente", "desinfetante", "esponja", "sabao", "vassoura"],
  },
  { category: "Bebidas", words: ["agua", "cerveja", "refrigerante", "suco", "vinho"] },
  { category: "Pet", words: ["areia", "petisco", "racao"] },
];

const UNIT_KEYWORDS: Array<{ unit: string; words: string[] }> = [
  {
    unit: "kg",
    words: [
      "abacate",
      "abacaxi",
      "banana",
      "batata",
      "carne",
      "cebola",
      "cenoura",
      "frango",
      "laranja",
      "maca",
      "mamao",
      "manga",
      "peixe",
      "racao",
      "tomate",
      "uva",
    ],
  },
  { unit: "l", words: ["agua", "leite", "oleo", "refrigerante", "suco"] },
  { unit: "pct", words: ["arroz", "biscoito", "feijao", "macarrao", "pao", "papel higienico"] },
  { unit: "un", words: ["desodorante", "detergente", "esponja", "sabonete", "shampoo"] },
  { unit: "cx", words: ["cerveja", "leite", "ovos"] },
  { unit: "gar", words: ["azeite", "vinho"] },
];

export function suggestItemDefaults(name: string): ItemDefaults {
  const normalizedName = normalizeText(name);

  return {
    category: findCategory(normalizedName),
    unit: findUnit(normalizedName),
  };
}

export function formatPriceInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return formatCents(Number(digits));
}

export function formatPriceFromNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  return formatCents(Math.round(Number(value) * 100));
}

export function parsePriceInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  return Number(digits) / 100;
}

export function buildQuantity(amount: string, unit: string) {
  const trimmedAmount = amount.trim();

  if (!trimmedAmount) {
    return null;
  }

  return unit ? `${trimmedAmount} ${unit}` : trimmedAmount;
}

export function parseQuantity(value: string | null | undefined) {
  const trimmedValue = value?.trim() ?? "";

  if (!trimmedValue) {
    return { amount: "", unit: "" };
  }

  const parts = trimmedValue.split(/\s+/);
  const possibleUnit = parts.at(-1)?.toLowerCase() ?? "";

  if (UNIT_OPTIONS.includes(possibleUnit) && parts.length > 1) {
    return {
      amount: parts.slice(0, -1).join(" "),
      unit: possibleUnit,
    };
  }

  return { amount: trimmedValue, unit: "" };
}

function findCategory(normalizedName: string): Category {
  const match = CATEGORY_KEYWORDS.find(({ words }) =>
    words.some((word) => includesWord(normalizedName, word)),
  );

  return match?.category ?? "Outros";
}

function findUnit(normalizedName: string) {
  const match = UNIT_KEYWORDS.find(({ words }) =>
    words.some((word) => includesWord(normalizedName, word)),
  );

  return match?.unit ?? "un";
}

function includesWord(value: string, word: string) {
  return value.includes(normalizeText(word));
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
