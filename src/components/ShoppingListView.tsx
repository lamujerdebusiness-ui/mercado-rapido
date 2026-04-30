"use client";

import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Files,
  ListPlus,
  MoreHorizontal,
  QrCode,
  RotateCcw,
  Tags,
  Share2,
  Trash2,
  UsersRound,
} from "lucide-react";
import { AddItemForm } from "./AddItemForm";
import { CategorySection } from "./CategorySection";
import { CategorySelect } from "./CategorySelect";
import { EmptyState } from "./EmptyState";
import { InvoiceImport } from "./InvoiceImport";
import { CATEGORIES } from "@/lib/categories";
import type { Category, ShoppingItem, ShoppingList, ShoppingListCollaborator } from "@/lib/types";
import { formatCurrency, getCompletionPercent, getListStats, sortItems } from "@/lib/utils";

type ShoppingListViewProps = {
  list: ShoppingList;
  lists: ShoppingList[];
  items: ShoppingItem[];
  collaborators: ShoppingListCollaborator[];
  currentUserId: string;
  busy?: boolean;
  error?: string;
  onBack: () => void;
  onRename: (list: ShoppingList, name: string) => Promise<void>;
  onAddItem: (payload: {
    name: string;
    quantity: string | null;
    category: Category;
    unit_price: number | null;
  }) => Promise<void>;
  onToggleItem: (item: ShoppingItem) => void;
  onEditItem: (
    item: ShoppingItem,
    payload: { name: string; quantity: string | null; category: Category; unit_price: number | null },
  ) => Promise<void>;
  onDeleteItem: (item: ShoppingItem) => void;
  onMoveItem: (item: ShoppingItem, direction: "up" | "down") => void;
  onBulkMoveItems: (items: ShoppingItem[], category: Category) => Promise<void>;
  onBulkTransferItems: (items: ShoppingItem[], targetList: ShoppingList, mode: "copy" | "move") => Promise<void>;
  onBulkCreateList: (items: ShoppingItem[], name: string) => Promise<void>;
  onBulkDeleteItems: (items: ShoppingItem[]) => Promise<void>;
  onClearPurchased: () => void;
  onUncheckAll: () => void;
  onDuplicateList: (list: ShoppingList) => void;
  onDeleteList: (list: ShoppingList) => void;
  onArchiveList: (list: ShoppingList, archived: boolean) => void;
  onFinishList: (list: ShoppingList) => void;
  onShareList: (list: ShoppingList) => void;
  onUpdateCategoryOrder: (list: ShoppingList, categories: Category[]) => Promise<void>;
  onImportInvoice: (
    items: Array<{ name: string; quantity: string | null; category: Category; unit_price: number | null }>,
  ) => Promise<void>;
};

export function ShoppingListView({
  list,
  lists,
  items,
  collaborators,
  currentUserId,
  busy,
  error,
  onBack,
  onRename,
  onAddItem,
  onToggleItem,
  onEditItem,
  onDeleteItem,
  onMoveItem,
  onBulkMoveItems,
  onBulkTransferItems,
  onBulkCreateList,
  onBulkDeleteItems,
  onClearPurchased,
  onUncheckAll,
  onDuplicateList,
  onDeleteList,
  onArchiveList,
  onFinishList,
  onShareList,
  onUpdateCategoryOrder,
  onImportInvoice,
}: ShoppingListViewProps) {
  const [name, setName] = useState(list.name);
  const [renaming, setRenaming] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<Category>("Outros");
  const [bulkTargetListId, setBulkTargetListId] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const stats = getListStats(items);
  const percent = getCompletionPercent(items);
  const sharingText = getSharingText(list, collaborators, currentUserId);
  const categories = useMemo(() => getListCategories(list, items), [items, list]);
  const selectedItems = useMemo(
    () => items.filter((item) => selectedItemIds.has(item.id)),
    [items, selectedItemIds],
  );
  const selectionMode = selectedItemIds.size > 0;
  const targetLists = useMemo(
    () => lists.filter((item) => item.id !== list.id && item.completed_at === null),
    [list.id, lists],
  );

  useEffect(() => {
    setName(list.name);
  }, [list.id, list.name]);

  const groupedItems = useMemo(
    () =>
      categories.map((category) => ({
        category,
        items: sortItems(items.filter((item) => item.category === category)),
      })),
    [categories, items],
  );

  async function saveName() {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName === list.name) {
      setName(list.name);
      return;
    }

    setRenaming(true);
    await onRename(list, trimmedName);
    setRenaming(false);
  }

  function handleNameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }

    if (event.key === "Escape") {
      setName(list.name);
      event.currentTarget.blur();
    }
  }

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    setName(event.target.value);
  }

  async function addCategory(category: Category) {
    const nextCategories = appendCategory(categories, category);
    if (nextCategories.length !== categories.length) {
      await onUpdateCategoryOrder(list, nextCategories);
    }
  }

  async function moveCategory(category: Category, direction: "up" | "down") {
    const index = categories.findIndex((item) => item === category);
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (index < 0 || targetIndex < 0 || targetIndex >= categories.length) {
      return;
    }

    const nextCategories = [...categories];
    [nextCategories[index], nextCategories[targetIndex]] = [nextCategories[targetIndex], nextCategories[index]];
    await onUpdateCategoryOrder(list, nextCategories);
  }

  function startSelection(item: ShoppingItem) {
    setSelectedItemIds(new Set([item.id]));
    setBulkCategory(item.category);
    setBulkTargetListId(targetLists[0]?.id ?? "");
  }

  function toggleSelection(item: ShoppingItem) {
    setSelectedItemIds((current) => {
      const next = new Set(current);

      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }

      return next;
    });
    setBulkCategory(item.category);
  }

  function clearSelection() {
    setSelectedItemIds(new Set());
  }

  async function moveSelectedItems() {
    if (selectedItems.length === 0) {
      return;
    }

    setBulkSaving(true);
    await addCategory(bulkCategory);
    await onBulkMoveItems(selectedItems, bulkCategory);
    setBulkSaving(false);
    clearSelection();
  }

  async function transferSelectedItems(mode: "copy" | "move") {
    if (selectedItems.length === 0 || !bulkTargetListId) {
      return;
    }

    const targetList = targetLists.find((item) => item.id === bulkTargetListId);
    if (!targetList) {
      return;
    }

    setBulkSaving(true);
    await onBulkTransferItems(selectedItems, targetList, mode);
    setBulkSaving(false);
    clearSelection();
  }

  async function createListFromSelectedItems() {
    if (selectedItems.length === 0) {
      return;
    }

    const name = window.prompt("Nome da nova lista", `Selecionados de ${list.name}`);
    const trimmedName = name?.trim();

    if (!trimmedName) {
      return;
    }

    setBulkSaving(true);
    await onBulkCreateList(selectedItems, trimmedName);
    setBulkSaving(false);
    clearSelection();
  }

  async function deleteSelectedItems() {
    if (selectedItems.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Excluir ${selectedItems.length} ${selectedItems.length === 1 ? "item selecionado" : "itens selecionados"}? Essa ação não pode ser desfeita.`,
    );

    if (!confirmed) {
      return;
    }

    setBulkSaving(true);
    await onBulkDeleteItems(selectedItems);
    setBulkSaving(false);
    clearSelection();
  }

  return (
    <section className="mx-auto w-full max-w-3xl overflow-x-hidden px-4 py-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Voltar
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDuplicateList(list)}
            disabled={busy}
            className="inline-flex min-h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            aria-label="Duplicar lista"
            title="Duplicar lista"
          >
            <Copy size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteList(list)}
            disabled={busy}
            className="inline-flex min-h-11 w-11 items-center justify-center rounded-lg border border-red-100 bg-white text-red-600 shadow-sm hover:bg-red-50 disabled:opacity-60"
            aria-label="Excluir lista"
            title="Excluir lista"
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
        <label className="sr-only" htmlFor="list-name">
          Nome da lista
        </label>
        <input
          id="list-name"
          value={name}
          onChange={handleNameChange}
          onBlur={saveName}
          onKeyDown={handleNameKeyDown}
          className="w-full rounded-lg border border-transparent bg-slate-50 px-3 py-2 text-2xl font-bold tracking-tight text-slate-950 outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          disabled={renaming}
        />
        {sharingText ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800">
            <UsersRound size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{sharingText}</span>
          </p>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryTile label="Itens" value={stats.total} />
          <SummaryTile label="Comprados" value={stats.purchased} />
          <SummaryTile label="Pendentes" value={stats.pending} />
          <SummaryTile label="Estimado" value={formatCurrency(stats.estimatedTotal)} />
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {percent}% concluído · {formatCurrency(stats.purchasedTotal)} já marcado como comprado
        </p>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="mt-4">
        <AddItemForm categories={categories} busy={busy} onCreateCategory={(category) => void addCategory(category)} onAdd={onAddItem} />
      </div>

      <div className="relative mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => setActionsOpen((current) => !current)}
          className="inline-flex min-h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
          aria-label="Ações da lista"
          aria-expanded={actionsOpen}
        >
          <MoreHorizontal size={20} aria-hidden="true" />
        </button>

        {actionsOpen ? (
          <div className="absolute right-0 top-12 z-10 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            <ListActionButton
              icon={<QrCode size={17} aria-hidden="true" />}
              label="Importar NFC-e"
              disabled={busy}
              onClick={() => {
                setActionsOpen(false);
                setImportOpen(true);
              }}
            />
            <ListActionButton
              icon={<Share2 size={17} aria-hidden="true" />}
              label="Copiar link familiar"
              disabled={busy}
              onClick={() => {
                setActionsOpen(false);
                onShareList(list);
              }}
            />
            <ListActionButton
              icon={<CheckCircle2 size={17} aria-hidden="true" />}
              label="Finalizar compra"
              disabled={busy || items.length === 0 || list.completed_at !== null}
              className="text-emerald-700 hover:bg-emerald-50"
              onClick={() => {
                setActionsOpen(false);
                onFinishList(list);
              }}
            />
            <ListActionButton
              icon={<RotateCcw size={17} aria-hidden="true" />}
              label="Desmarcar todos"
              disabled={busy || items.length === 0 || stats.purchased === 0}
              onClick={() => {
                setActionsOpen(false);
                onUncheckAll();
              }}
            />
            <ListActionButton
              icon={<Trash2 size={17} aria-hidden="true" />}
              label="Remover comprados"
              disabled={busy || stats.purchased === 0}
              className="text-red-600 hover:bg-red-50"
              onClick={() => {
                setActionsOpen(false);
                onClearPurchased();
              }}
            />
            <ListActionButton
              icon={
                list.archived ? (
                  <ArchiveRestore size={17} aria-hidden="true" />
                ) : (
                  <Archive size={17} aria-hidden="true" />
                )
              }
              label={list.archived ? "Reativar lista" : "Arquivar lista"}
              disabled={busy || list.completed_at !== null}
              onClick={() => {
                setActionsOpen(false);
                onArchiveList(list, !list.archived);
              }}
            />
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Lista vazia"
            description="Adicione os itens do mercado. O app salva tudo no Supabase automaticamente."
          />
        </div>
      ) : (
        <div className={`mt-4 grid min-w-0 gap-4 ${selectionMode ? "pb-96" : ""}`}>
          {groupedItems.map(({ category, items: categoryItems }, index) => (
            <CategorySection
              key={category}
              category={category}
              categories={categories}
              items={categoryItems}
              first={index === 0}
              last={index === groupedItems.length - 1}
              busy={busy}
              selectedItemIds={selectedItemIds}
              selectionMode={selectionMode}
              onMoveCategory={(itemCategory, direction) => void moveCategory(itemCategory, direction)}
              onCreateCategory={(itemCategory) => void addCategory(itemCategory)}
              onToggle={onToggleItem}
              onToggleSelection={toggleSelection}
              onStartSelection={startSelection}
              onDelete={onDeleteItem}
              onMove={onMoveItem}
              onEdit={onEditItem}
            />
          ))}
        </div>
      )}

      <InvoiceImport
        open={importOpen}
        busy={busy}
        onClose={() => setImportOpen(false)}
        onImport={onImportInvoice}
      />

      {selectionMode ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_28px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="mx-auto grid max-w-3xl gap-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">
                {selectedItemIds.size} {selectedItemIds.size === 1 ? "item selecionado" : "itens selecionados"}
              </p>
              <button
                type="button"
                onClick={clearSelection}
                className="min-h-10 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <CategorySelect
                value={bulkCategory}
                categories={categories}
                onCreateCategory={(category) => void addCategory(category)}
                onChange={setBulkCategory}
                className="h-12 min-w-0 rounded-lg border border-slate-300 px-3 pl-8 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
              <button
                type="button"
                onClick={() => void moveSelectedItems()}
                disabled={busy || bulkSaving}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Tags size={17} aria-hidden="true" />
                Mover
              </button>
            </div>
            {targetLists.length > 0 ? (
              <div className="grid gap-2">
                <select
                  value={bulkTargetListId}
                  onChange={(event) => setBulkTargetListId(event.target.value)}
                  className="h-12 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  aria-label="Lista de destino"
                >
                  {targetLists.map((targetList) => (
                    <option key={targetList.id} value={targetList.id}>
                      {targetList.name}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void transferSelectedItems("copy")}
                    disabled={busy || bulkSaving || !bulkTargetListId}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:opacity-60"
                  >
                    <Files size={17} aria-hidden="true" />
                    Copiar
                  </button>
                  <button
                    type="button"
                    onClick={() => void transferSelectedItems("move")}
                    disabled={busy || bulkSaving || !bulkTargetListId}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:opacity-60"
                  >
                    <ArrowLeft size={17} className="rotate-180" aria-hidden="true" />
                    Mover lista
                  </button>
                </div>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void createListFromSelectedItems()}
                disabled={busy || bulkSaving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:opacity-60"
              >
                <ListPlus size={17} aria-hidden="true" />
                Nova lista
              </button>
              <button
                type="button"
                onClick={() => void deleteSelectedItems()}
                disabled={busy || bulkSaving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-100 bg-white px-3 text-sm font-semibold text-red-600 disabled:opacity-60"
              >
                <Trash2 size={17} aria-hidden="true" />
                Excluir
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SummaryTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-center">
      <p className="text-xl font-bold text-slate-950">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function ListActionButton({
  icon,
  label,
  disabled,
  className = "text-slate-700 hover:bg-slate-50",
  onClick,
}: {
  icon: ReactNode;
  label: string;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold disabled:opacity-40 ${className}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function getSharingText(
  list: ShoppingList,
  collaborators: ShoppingListCollaborator[],
  currentUserId: string,
) {
  if (list.user_id !== currentUserId) {
    const otherNames = formatNames(collaborators.filter((collaborator) => collaborator.user_id !== currentUserId));
    return otherNames ? `Lista compartilhada com você e ${otherNames}` : "Lista compartilhada com você";
  }

  if (collaborators.length === 0) {
    return "";
  }

  return `Lista compartilhada com ${formatNames(collaborators)}`;
}

function formatNames(collaborators: ShoppingListCollaborator[]) {
  const names = collaborators.map((collaborator) => collaborator.display_name || collaborator.email || "Pessoa");
  const visibleNames = names.slice(0, 3).join(", ");
  const remaining = names.length - 3;

  if (remaining > 0) {
    return `${visibleNames} +${remaining}`;
  }

  return visibleNames;
}

function getListCategories(list: ShoppingList, items: ShoppingItem[]) {
  const itemCategories = items.map((item) => item.category);
  return uniqueCategories([...(list.category_order ?? CATEGORIES), ...itemCategories, "Outros"]);
}

function appendCategory(categories: Category[], category: Category) {
  return uniqueCategories([...categories, category]);
}

function uniqueCategories(categories: Category[]) {
  const seen = new Set<string>();

  return categories.filter((category) => {
    const trimmedCategory = category.trim();
    const key = trimmedCategory.toLowerCase();

    if (!trimmedCategory || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
