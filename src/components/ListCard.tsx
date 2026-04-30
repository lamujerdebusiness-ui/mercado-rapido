"use client";

import { Archive, ArchiveRestore, Copy, ExternalLink, Trash2, UsersRound } from "lucide-react";
import type { ListStats, ShoppingList, ShoppingListCollaborator } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type ListCardProps = {
  list: ShoppingList;
  stats: ListStats;
  collaborators: ShoppingListCollaborator[];
  currentUserId: string;
  busy?: boolean;
  onOpen: (listId: string) => void;
  onDuplicate: (list: ShoppingList) => void;
  onDelete: (list: ShoppingList) => void;
  onArchive: (list: ShoppingList, archived: boolean) => void;
};

export function ListCard({
  list,
  stats,
  collaborators,
  currentUserId,
  busy,
  onOpen,
  onDuplicate,
  onDelete,
  onArchive,
}: ListCardProps) {
  const sharingText = getSharingText(list, collaborators, currentUserId);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-lg font-semibold text-slate-950">{list.name}</h2>
            {sharingText ? (
              <UsersRound
                size={17}
                className="shrink-0 text-sky-600"
                aria-label="Lista compartilhada"
              />
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-500">Atualizada em {formatDateTime(list.updated_at)}</p>
          {sharingText ? (
            <p className="mt-1 flex items-start gap-1.5 text-xs font-medium text-sky-700">
              <UsersRound size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">{sharingText}</span>
            </p>
          ) : null}
          {list.completed_at ? (
            <p className="mt-1 text-xs font-medium text-emerald-700">
              Finalizada em {formatDateTime(list.completed_at)}
            </p>
          ) : null}
        </div>
        <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          {stats.pending} pend.
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-lg font-bold text-slate-950">{stats.total}</p>
          <p className="text-xs text-slate-500">itens</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="text-lg font-bold text-slate-950">{stats.purchased}</p>
          <p className="text-xs text-slate-500">comprados</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <p className="truncate text-lg font-bold text-slate-950">{formatCurrency(stats.estimatedTotal)}</p>
          <p className="text-xs text-slate-500">estimado</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_auto_auto] gap-2">
        <button
          type="button"
          onClick={() => onOpen(list.id)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <ExternalLink size={17} aria-hidden="true" />
          Abrir
        </button>
        <button
          type="button"
          onClick={() => onDuplicate(list)}
          disabled={busy}
          className="inline-flex min-h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          aria-label="Duplicar lista"
          title="Duplicar lista"
        >
          <Copy size={17} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onArchive(list, !list.archived)}
          disabled={busy || list.completed_at !== null}
          className="inline-flex min-h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          aria-label={list.archived ? "Reativar lista" : "Arquivar lista"}
          title={list.archived ? "Reativar lista" : "Arquivar lista"}
        >
          {list.archived ? <ArchiveRestore size={17} aria-hidden="true" /> : <Archive size={17} aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={() => onDelete(list)}
          disabled={busy}
          className="inline-flex min-h-11 w-11 items-center justify-center rounded-lg border border-red-100 text-red-600 hover:bg-red-50 disabled:opacity-60"
          aria-label="Excluir lista"
          title="Excluir lista"
        >
          <Trash2 size={17} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function getSharingText(
  list: ShoppingList,
  collaborators: ShoppingListCollaborator[],
  currentUserId: string,
) {
  if (list.user_id !== currentUserId) {
    const otherNames = formatNames(collaborators.filter((collaborator) => collaborator.user_id !== currentUserId));
    return otherNames ? `Compartilhada com você e ${otherNames}` : "Compartilhada com você";
  }

  if (collaborators.length === 0) {
    return "";
  }

  return `Compartilhada com ${formatNames(collaborators)}`;
}

function formatNames(collaborators: ShoppingListCollaborator[]) {
  const names = collaborators.map((collaborator) => getCollaboratorName(collaborator));
  const visibleNames = names.slice(0, 2).join(", ");
  const remaining = names.length - 2;

  if (remaining > 0) {
    return `${visibleNames} +${remaining}`;
  }

  return visibleNames;
}

function getCollaboratorName(collaborator: ShoppingListCollaborator) {
  return collaborator.display_name || collaborator.email || "Pessoa";
}
