"use client";

import { ShoppingItemRow } from "./ShoppingItemRow";
import type { Category, ShoppingItem } from "@/lib/types";

type CategorySectionProps = {
  category: Category;
  items: ShoppingItem[];
  busy?: boolean;
  onToggle: (item: ShoppingItem) => void;
  onDelete: (item: ShoppingItem) => void;
  onMove: (item: ShoppingItem, direction: "up" | "down") => void;
  onEdit: (
    item: ShoppingItem,
    payload: { name: string; quantity: string | null; category: Category; unit_price: number | null },
  ) => Promise<void>;
};

export function CategorySection({
  category,
  items,
  busy,
  onToggle,
  onDelete,
  onMove,
  onEdit,
}: CategorySectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-500">{category}</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {items.length}
        </span>
      </div>
      <div className="grid gap-2">
        {items.map((item, index) => (
          <ShoppingItemRow
            key={item.id}
            item={item}
            first={index === 0}
            last={index === items.length - 1}
            busy={busy}
            onToggle={onToggle}
            onDelete={onDelete}
            onMove={onMove}
            onEdit={onEdit}
          />
        ))}
      </div>
    </section>
  );
}
