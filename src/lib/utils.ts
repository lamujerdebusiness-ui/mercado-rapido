import type { ListStats, ShoppingItem } from "./types";
import { getQuantityMultiplier } from "./itemInput";

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getListStats(items: ShoppingItem[]): ListStats {
  const purchased = items.filter((item) => item.purchased).length;
  const estimatedTotal = items.reduce((total, item) => total + getItemTotal(item), 0);
  const purchasedTotal = items.reduce(
    (total, item) => total + (item.purchased ? getItemTotal(item) : 0),
    0,
  );

  return {
    total: items.length,
    purchased,
    pending: items.length - purchased,
    estimatedTotal,
    purchasedTotal,
  };
}

export function getItemTotal(item: ShoppingItem) {
  return Number(item.unit_price ?? 0) * getQuantityMultiplier(item.quantity);
}

export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

export function getCompletionPercent(items: ShoppingItem[]) {
  if (items.length === 0) {
    return 0;
  }

  return Math.round((items.filter((item) => item.purchased).length / items.length) * 100);
}

export function sortItems(items: ShoppingItem[]) {
  return [...items].sort((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position;
    }

    return a.created_at.localeCompare(b.created_at);
  });
}

export function getSupabaseMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return fallback;
}
