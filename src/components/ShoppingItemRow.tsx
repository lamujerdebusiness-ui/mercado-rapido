"use client";

import { FormEvent, useState } from "react";
import { Check, ChevronDown, ChevronUp, Pencil, Save, Trash2, X } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import {
  UNIT_OPTIONS,
  buildQuantity,
  formatPriceFromNumber,
  formatPriceInput,
  parsePriceInput,
  parseQuantity,
  suggestItemDefaults,
} from "@/lib/itemInput";
import type { Category, ShoppingItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type ShoppingItemRowProps = {
  item: ShoppingItem;
  first: boolean;
  last: boolean;
  busy?: boolean;
  onToggle: (item: ShoppingItem) => void;
  onDelete: (item: ShoppingItem) => void;
  onMove: (item: ShoppingItem, direction: "up" | "down") => void;
  onEdit: (
    item: ShoppingItem,
    payload: { name: string; quantity: string | null; category: Category; unit_price: number | null },
  ) => Promise<void>;
};

export function ShoppingItemRow({
  item,
  first,
  last,
  busy,
  onToggle,
  onDelete,
  onMove,
  onEdit,
}: ShoppingItemRowProps) {
  const initialQuantity = parseQuantity(item.quantity);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [quantityAmount, setQuantityAmount] = useState(initialQuantity.amount);
  const [quantityUnit, setQuantityUnit] = useState(initialQuantity.unit || suggestItemDefaults(item.name).unit);
  const [unitPrice, setUnitPrice] = useState(formatPriceFromNumber(item.unit_price));
  const [category, setCategory] = useState<Category>(item.category);
  const [manualCategory, setManualCategory] = useState(false);
  const [manualUnit, setManualUnit] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = name.trim();

    if (!nextName) {
      return;
    }

    setSaving(true);
    await onEdit(item, {
      name: nextName,
      quantity: buildQuantity(quantityAmount, quantityUnit),
      category,
      unit_price: parsePriceInput(unitPrice),
    });
    setSaving(false);
    setEditing(false);
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

  function resetEditing() {
    const nextQuantity = parseQuantity(item.quantity);
    setName(item.name);
    setQuantityAmount(nextQuantity.amount);
    setQuantityUnit(nextQuantity.unit || suggestItemDefaults(item.name).unit);
    setUnitPrice(formatPriceFromNumber(item.unit_price));
    setCategory(item.category);
    setManualCategory(false);
    setManualUnit(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <form onSubmit={submit} className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
        <input
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
          className="h-11 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          autoFocus
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            value={quantityAmount}
            onChange={(event) => setQuantityAmount(event.target.value)}
            className="h-11 rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            placeholder="Qtd"
            inputMode="decimal"
            aria-label="Quantidade"
          />
          <input
            value={unitPrice}
            onChange={(event) => setUnitPrice(formatPriceInput(event.target.value))}
            className="h-11 rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            placeholder="Preço"
            inputMode="numeric"
            aria-label="Preço estimado"
          />
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
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
                  ? "border-emerald-600 bg-white text-emerald-700"
                  : "border-emerald-100 bg-emerald-50 text-slate-700"
              }`}
            >
              {unit}
            </button>
          ))}
        </div>
        <div className="mt-2">
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value as Category);
              setManualCategory(true);
            }}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          >
            {CATEGORIES.map((itemCategory) => (
              <option key={itemCategory} value={itemCategory}>
                {itemCategory}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={resetEditing}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
          >
            <X size={16} aria-hidden="true" />
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Save size={16} aria-hidden="true" />
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white p-2">
      <button
        type="button"
        onClick={() => onToggle(item)}
        disabled={busy}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-white ${
          item.purchased
            ? "border-emerald-600 bg-emerald-600"
            : "border-slate-300 bg-white text-transparent"
        }`}
        aria-label={
          item.purchased
            ? `Marcar ${item.name} como pendente`
            : `Marcar ${item.name} como comprado`
        }
      >
        <Check size={20} aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-base font-medium ${
            item.purchased ? "text-slate-400 line-through" : "text-slate-950"
          }`}
        >
          {item.name}
        </p>
        {item.quantity ? (
          <p className={`truncate text-sm ${item.purchased ? "text-slate-400" : "text-slate-500"}`}>
            {item.quantity}
          </p>
        ) : null}
        {item.unit_price !== null ? (
          <p className={`truncate text-sm font-semibold ${item.purchased ? "text-slate-400" : "text-emerald-700"}`}>
            {formatCurrency(item.unit_price)}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onMove(item, "up")}
          disabled={busy || first}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30"
          aria-label={`Subir ${item.name}`}
          title="Subir"
        >
          <ChevronUp size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onMove(item, "down")}
          disabled={busy || last}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30"
          aria-label={`Descer ${item.name}`}
          title="Descer"
        >
          <ChevronDown size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={busy}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          aria-label={`Editar ${item.name}`}
          title="Editar"
        >
          <Pencil size={17} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item)}
          disabled={busy}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40"
          aria-label={`Excluir ${item.name}`}
          title="Excluir"
        >
          <Trash2 size={17} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
