"use client";

import { FormEvent, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { CATEGORIES, DEFAULT_CATEGORY } from "@/lib/categories";
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
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [category, setCategory] = useState<Category>(DEFAULT_CATEGORY);
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
      quantity: quantity.trim() || null,
      category,
      unit_price: parsePrice(unitPrice),
    });

    setName("");
    setQuantity("");
    setUnitPrice("");
    window.requestAnimationFrame(() => nameRef.current?.focus());
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
        onChange={(event) => setName(event.target.value)}
        className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-4 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        placeholder="Ex.: arroz, banana, leite"
        autoComplete="off"
      />

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr]">
        <input
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          className="h-12 rounded-lg border border-slate-300 px-4 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          placeholder="Quantidade"
          autoComplete="off"
        />
        <input
          value={unitPrice}
          onChange={(event) => setUnitPrice(event.target.value)}
          className="h-12 rounded-lg border border-slate-300 px-4 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          placeholder="Preço estimado"
          inputMode="decimal"
          autoComplete="off"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value as Category)}
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

function parsePrice(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
