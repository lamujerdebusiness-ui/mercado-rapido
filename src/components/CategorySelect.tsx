"use client";

import type { Category } from "@/lib/types";

type CategorySelectProps = {
  value: Category;
  categories: Category[];
  onChange: (category: Category) => void;
  onCreateCategory: (category: Category) => void;
  className?: string;
};

const NEW_CATEGORY_VALUE = "__new_category__";

export function CategorySelect({
  value,
  categories,
  onChange,
  onCreateCategory,
  className,
}: CategorySelectProps) {
  function handleChange(nextValue: string) {
    if (nextValue !== NEW_CATEGORY_VALUE) {
      onChange(nextValue);
      return;
    }

    const name = window.prompt("Nome da nova categoria");
    const trimmedName = name?.trim();

    if (!trimmedName) {
      return;
    }

    onCreateCategory(trimmedName);
    onChange(trimmedName);
  }

  const normalizedCategories = normalizeCategories(categories, value);

  return (
    <select
      value={normalizedCategories.includes(value) ? value : ""}
      onChange={(event) => handleChange(event.target.value)}
      className={
        className ??
        "h-12 rounded-lg border border-slate-300 px-4 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
      }
    >
      {normalizedCategories.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
      <option value={NEW_CATEGORY_VALUE}>+ Nova categoria...</option>
    </select>
  );
}

function normalizeCategories(categories: Category[], currentValue: Category) {
  const values = currentValue ? [...categories, currentValue] : categories;
  const seen = new Set<string>();

  return values.filter((category) => {
    const key = category.trim().toLowerCase();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
