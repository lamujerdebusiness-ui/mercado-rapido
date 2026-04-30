"use client";

import { FormEvent, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { CATEGORIES, DEFAULT_CATEGORY } from "@/lib/categories";
import {
  UNIT_OPTIONS,
  buildQuantity,
  formatPriceInput,
  parsePriceInput,
  suggestItemDefaults,
} from "@/lib/itemInput";
import type { Category } from "@/lib/types";

type AddItemFormProps = {
  busy?: boolean;
  onAdd: (payload: {
    name: string;
    quantity: string | null;
    category: Category;
    unit_price: number | null;
  }) => Promise<void>;
};

export function AddItemForm({ busy, onAdd }: AddItemFormProps) {
  const [name, setName] = useState("");
  const [quantityAmount, setQuantityAmount] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("un");
  const [unitPrice, setUnitPrice] = useState("");
  const [category, setCategory] = useState<Category>(DEFAULT_CATEGORY);
  const [manualCategory, setManualCategory] = useState(false);
  const [manualUnit, setManualUnit] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      nameRef.current?.focus();
      return;
    }

    await onAdd({
      name: trimmedName,
      quantity: buildQuantity(quantityAmount, quantityUnit),
      category,
      unit_price: parsePriceInput(unitPrice),
    });

    setName("");
    setQuantityAmount("");
    setUnitPrice("");
    setManualCategory(false);
    setManualUnit(false);
    window.requestAnimationFrame(() => nameRef.current?.focus());
  }

  function handleNameChange(value: string) {
    setName(value);

    const suggestion = suggestItemDefaults(value);
    if (!manualCategory) {
      setCategory(suggestion.category);
    }
    if (!manualUnit) {
      setQuantityUnit(suggestion.unit);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
      <label className="block text-sm font-medium text-slate-700" htmlFor="item-name">
        Adicionar item
      </label>
      <input
        ref={nameRef}
        id="item-name"
        value={name}
        onChange={(event) => handleNameChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-4 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        placeholder="Ex.: arroz, banana, leite"
        autoComplete="off"
      />

      <div className="mt-3 grid grid-cols-2 gap-3">
        <input
          value={quantityAmount}
          onChange={(event) => setQuantityAmount(event.target.value)}
          className="h-12 rounded-lg border border-slate-300 px-4 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          placeholder="Qtd"
          inputMode="decimal"
          autoComplete="off"
          aria-label="Quantidade"
        />
        <input
          value={unitPrice}
          onChange={(event) => setUnitPrice(formatPriceInput(event.target.value))}
          className="h-12 rounded-lg border border-slate-300 px-4 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          placeholder="Preço"
          inputMode="numeric"
          autoComplete="off"
          aria-label="Preço estimado"
        />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {UNIT_OPTIONS.map((unit) => (
          <button
            key={unit}
            type="button"
            onClick={() => {
              setQuantityUnit(unit);
              setManualUnit(true);
            }}
            className={`min-h-10 shrink-0 rounded-lg border px-3 text-sm font-semibold ${
              quantityUnit === unit
                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {unit}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value as Category);
            setManualCategory(true);
          }}
          className="h-12 rounded-lg border border-slate-300 px-4 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        >
          {CATEGORIES.map((itemCategory) => (
            <option key={itemCategory} value={itemCategory}>
              {itemCategory}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          <Plus size={18} aria-hidden="true" />
          {busy ? "Salvando..." : "Adicionar"}
        </button>
      </div>
    </form>
  );
}
