"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { ShoppingItemRow } from "./ShoppingItemRow";
import type { Category, ShoppingItem } from "@/lib/types";

type CategorySectionProps = {
  category: Category;
  categories: Category[];
  items: ShoppingItem[];
  first: boolean;
  last: boolean;
  busy?: boolean;
  selectedItemIds: Set<string>;
  selectionMode: boolean;
  onMoveCategory: (category: Category, direction: "up" | "down") => void;
  onToggle: (item: ShoppingItem) => void;
  onToggleSelection: (item: ShoppingItem) => void;
  onStartSelection: (item: ShoppingItem) => void;
  onDelete: (item: ShoppingItem) => void;
  onMove: (item: ShoppingItem, direction: "up" | "down") => void;
  onCreateCategory: (category: Category) => void;
  onEdit: (
    item: ShoppingItem,
    payload: { name: string; quantity: string | null; category: Category; unit_price: number | null },
  ) => Promise<void>;
};

export function CategorySection({
  category,
  categories,
  items,
  first,
  last,
  busy,
  selectedItemIds,
  selectionMode,
  onMoveCategory,
  onToggle,
  onToggleSelection,
  onStartSelection,
  onDelete,
  onMove,
  onCreateCategory,
  onEdit,
}: CategorySectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold uppercase tracking-[0.08em] text-slate-500">{category}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onMoveCategory(category, "up")}
            disabled={busy || first}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            aria-label={`Mover categoria ${category} para cima`}
          >
            <ChevronUp size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onMoveCategory(category, "down")}
            disabled={busy || last}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            aria-label={`Mover categoria ${category} para baixo`}
          >
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {items.length}
          </span>
        </div>
      </div>
      <div className="grid min-w-0 gap-2">
        {items.map((item, index) => (
          <ShoppingItemRow
            key={item.id}
            item={item}
            categories={categories}
            first={index === 0}
            last={index === items.length - 1}
            busy={busy}
            selected={selectedItemIds.has(item.id)}
            selectionMode={selectionMode}
            onCreateCategory={onCreateCategory}
            onToggle={onToggle}
            onToggleSelection={onToggleSelection}
            onStartSelection={onStartSelection}
            onDelete={onDelete}
            onMove={onMove}
            onEdit={onEdit}
          />
        ))}
      </div>
    </section>
  );
}
