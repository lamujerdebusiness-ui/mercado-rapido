"use client";

import { Plus } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { ListCard } from "./ListCard";
import type { DashboardView, ListStats, ShoppingList, ShoppingListCollaborator } from "@/lib/types";

type ListDashboardProps = {
  lists: ShoppingList[];
  statsByList: Record<string, ListStats>;
  collaboratorsByList: Record<string, ShoppingListCollaborator[]>;
  currentUserId: string;
  view: DashboardView;
  loading: boolean;
  busy?: boolean;
  error?: string;
  notice?: string;
  onChangeView: (view: DashboardView) => void;
  onCreateList: () => void;
  onOpenList: (listId: string) => void;
  onDuplicateList: (list: ShoppingList) => void;
  onDeleteList: (list: ShoppingList) => void;
  onArchiveList: (list: ShoppingList, archived: boolean) => void;
};

export function ListDashboard({
  lists,
  statsByList,
  collaboratorsByList,
  currentUserId,
  view,
  loading,
  busy,
  error,
  notice,
  onChangeView,
  onCreateList,
  onOpenList,
  onDuplicateList,
  onDeleteList,
  onArchiveList,
}: ListDashboardProps) {
  const filteredLists = lists.filter((list) => {
    if (view === "history") {
      return list.completed_at !== null;
    }

    if (view === "archived") {
      return list.archived && list.completed_at === null;
    }

    return !list.archived && list.completed_at === null;
  });

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Suas listas</h1>
          <p className="mt-1 text-sm text-slate-600">Crie, reutilize e acompanhe suas compras.</p>
        </div>
        <button
          type="button"
          onClick={onCreateList}
          disabled={busy}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          <Plus size={18} aria-hidden="true" />
          Nova
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      {notice ? (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>
      ) : null}

      <div className="mt-5 grid grid-cols-3 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <ViewButton active={view === "active"} onClick={() => onChangeView("active")}>
          Ativas
        </ViewButton>
        <ViewButton active={view === "archived"} onClick={() => onChangeView("archived")}>
          Arquivadas
        </ViewButton>
        <ViewButton active={view === "history"} onClick={() => onChangeView("history")}>
          Histórico
        </ViewButton>
      </div>

      {loading ? (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-soft">
          Carregando listas...
        </div>
      ) : null}

      {!loading && filteredLists.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title={view === "active" ? "Nenhuma lista ativa" : "Nada por aqui"}
            description={
              view === "active"
                ? "Crie sua primeira lista de mercado e adicione os itens enquanto organiza a compra."
                : "Listas arquivadas e compras finalizadas aparecem aqui quando você precisar comparar."
            }
            action={view === "active" ? "Toque em Nova lista para começar." : undefined}
          />
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {filteredLists.map((list) => (
          <ListCard
            key={list.id}
            list={list}
            stats={statsByList[list.id] ?? { total: 0, purchased: 0, pending: 0, estimatedTotal: 0, purchasedTotal: 0 }}
            collaborators={collaboratorsByList[list.id] ?? []}
            currentUserId={currentUserId}
            busy={busy}
            onOpen={onOpenList}
            onDuplicate={onDuplicateList}
            onDelete={onDeleteList}
            onArchive={onArchiveList}
          />
        ))}
      </div>
    </section>
  );
}

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${
        active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}
