"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { LogOut, ShoppingCart } from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";
import { ListDashboard } from "./ListDashboard";
import { ShoppingListView } from "./ShoppingListView";
import { supabase } from "@/lib/supabaseClient";
import type {
  Category,
  DashboardView,
  ListStats,
  ShoppingItem,
  ShoppingList,
  ShoppingListCollaborator,
} from "@/lib/types";
import { getListStats, getSupabaseMessage, sortItems } from "@/lib/utils";

type AppShellProps = {
  session: Session;
  shareToken?: string | null;
};

type ConfirmState =
  | { type: "delete-list"; list: ShoppingList }
  | { type: "clear-purchased"; list: ShoppingList }
  | { type: "finish-list"; list: ShoppingList }
  | null;

const EMPTY_STATS = { total: 0, purchased: 0, pending: 0, estimatedTotal: 0, purchasedTotal: 0 };

export function AppShell({ session, shareToken }: AppShellProps) {
  const user = session.user;
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [collaborators, setCollaborators] = useState<ShoppingListCollaborator[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [dashboardView, setDashboardView] = useState<DashboardView>("active");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const selectedList = lists.find((list) => list.id === selectedListId) ?? null;
  const selectedItems = selectedListId
    ? sortItems(items.filter((item) => item.list_id === selectedListId))
    : [];

  const statsByList = useMemo(() => {
    return lists.reduce<Record<string, ListStats>>((acc, list) => {
      acc[list.id] = getListStats(items.filter((item) => item.list_id === list.id));
      return acc;
    }, {});
  }, [items, lists]);

  const collaboratorsByList = useMemo(() => {
    return collaborators.reduce<Record<string, ShoppingListCollaborator[]>>((acc, collaborator) => {
      acc[collaborator.list_id] = [...(acc[collaborator.list_id] ?? []), collaborator];
      return acc;
    }, {});
  }, [collaborators]);

  useEffect(() => {
    void loadAll(shareToken);
  }, [shareToken]);

  async function loadAll(tokenToAccept?: string | null) {
    if (!supabase) {
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");
    let sharedListId: string | null = null;

    if (tokenToAccept) {
      const { data, error: shareError } = await supabase.rpc("accept_list_share", {
        token: tokenToAccept,
      });

      if (shareError) {
        setError("Não foi possível abrir o link compartilhado. Verifique se o link está correto.");
      } else {
        sharedListId = data as string;
        setNotice("Lista compartilhada adicionada à sua conta.");
        window.history.replaceState(null, "", window.location.pathname);
      }
    }

    const [listsResult, itemsResult, collaboratorsResult] = await Promise.all([
      supabase
        .from("shopping_lists")
        .select("*")
        .order("updated_at", { ascending: false })
        .returns<ShoppingList[]>(),
      supabase
        .from("shopping_items")
        .select("*")
        .order("position", { ascending: true })
        .returns<ShoppingItem[]>(),
      supabase.rpc("get_accessible_list_collaborators").returns<ShoppingListCollaborator[]>(),
    ]);

    if (listsResult.error) {
      setError(
        getSupabaseMessage(
          listsResult.error,
          "Não foi possível carregar suas listas. Verifique sua conexão e tente novamente.",
        ),
      );
    } else {
      setLists(listsResult.data ?? []);
    }

    if (itemsResult.error) {
      setError(
        getSupabaseMessage(
          itemsResult.error,
          "Não foi possível carregar seus itens. Verifique sua conexão e tente novamente.",
        ),
      );
    } else {
      setItems(itemsResult.data ?? []);
    }

    if (collaboratorsResult.error) {
      setError(
        getSupabaseMessage(
          collaboratorsResult.error,
          "Não foi possível carregar os compartilhamentos das listas.",
        ),
      );
    } else {
      setCollaborators(
        Array.isArray(collaboratorsResult.data)
          ? (collaboratorsResult.data as ShoppingListCollaborator[])
          : [],
      );
    }

    if (sharedListId) {
      setSelectedListId(sharedListId);
      setDashboardView("active");
    }

    setLoading(false);
  }

  async function signOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
  }

  async function touchList(listId: string) {
    if (!supabase) {
      return;
    }

    const list = lists.find((item) => item.id === listId);
    if (!list) {
      return;
    }

    const { data } = await supabase
      .from("shopping_lists")
      .update({ position: list.position })
      .eq("id", listId)
      .select()
      .single<ShoppingList>();

    if (data) {
      setLists((current) =>
        current
          .map((item) => (item.id === data.id ? data : item))
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
      );
    }
  }

  async function createList() {
    if (!supabase) {
      return;
    }

    setBusy(true);
    setError("");

    const { data, error: createError } = await supabase
      .from("shopping_lists")
      .insert({
        name: "Compra de hoje",
        user_id: user.id,
        position: getNextListPosition(lists),
      })
      .select()
      .single<ShoppingList>();

    if (createError || !data) {
      setError(getSupabaseMessage(createError, "Não foi possível criar a lista."));
    } else {
      setLists((current) => [data, ...current]);
      setSelectedListId(data.id);
    }

    setBusy(false);
  }

  async function renameList(list: ShoppingList, name: string) {
    if (!supabase) {
      return;
    }

    setBusy(true);
    setError("");

    const { data, error: updateError } = await supabase
      .from("shopping_lists")
      .update({ name })
      .eq("id", list.id)
      .select()
      .single<ShoppingList>();

    if (updateError || !data) {
      setError(getSupabaseMessage(updateError, "Não foi possível renomear a lista."));
    } else {
      setLists((current) =>
        current
          .map((item) => (item.id === data.id ? data : item))
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
      );
    }

    setBusy(false);
  }

  async function updateCategoryOrder(list: ShoppingList, categories: Category[]) {
    if (!supabase) {
      return;
    }

    const nextCategories = uniqueCategories(categories);
    setError("");
    setLists((current) =>
      current.map((item) => (item.id === list.id ? { ...item, category_order: nextCategories } : item)),
    );

    const { data, error: updateError } = await supabase
      .from("shopping_lists")
      .update({ category_order: nextCategories })
      .eq("id", list.id)
      .select()
      .single<ShoppingList>();

    if (updateError || !data) {
      setError(getSupabaseMessage(updateError, "Não foi possível salvar as categorias."));
    } else {
      setLists((current) => current.map((item) => (item.id === data.id ? data : item)));
    }
  }

  async function ensureCategoriesInList(listId: string, categoriesToAdd: Category[]) {
    const list = lists.find((item) => item.id === listId);
    if (!list) {
      return;
    }

    const currentCategories = list.category_order ?? [];
    const nextCategories = uniqueCategories([...currentCategories, ...categoriesToAdd]);

    if (nextCategories.length === currentCategories.length) {
      return;
    }

    await updateCategoryOrder(list, nextCategories);
  }

  async function deleteList(list: ShoppingList) {
    if (!supabase) {
      return;
    }

    setBusy(true);
    setError("");

    const { error: deleteError } = await supabase.from("shopping_lists").delete().eq("id", list.id);

    if (deleteError) {
      setError(getSupabaseMessage(deleteError, "Não foi possível excluir a lista."));
    } else {
      setLists((current) => current.filter((item) => item.id !== list.id));
      setItems((current) => current.filter((item) => item.list_id !== list.id));
      setCollaborators((current) => current.filter((item) => item.list_id !== list.id));
      if (selectedListId === list.id) {
        setSelectedListId(null);
      }
      setConfirm(null);
    }

    setBusy(false);
  }

  async function duplicateList(list: ShoppingList) {
    if (!supabase) {
      return;
    }

    setBusy(true);
    setError("");

    const { data: newList, error: listError } = await supabase
      .from("shopping_lists")
      .insert({
        name: `Cópia de ${list.name}`,
        user_id: user.id,
        position: getNextListPosition(lists),
        category_order: list.category_order,
      })
      .select()
      .single<ShoppingList>();

    if (listError || !newList) {
      setError(getSupabaseMessage(listError, "Não foi possível duplicar a lista."));
      setBusy(false);
      return;
    }

    const originalItems = sortItems(items.filter((item) => item.list_id === list.id));
    let insertedItems: ShoppingItem[] = [];

    if (originalItems.length > 0) {
      const { data, error: itemsError } = await supabase
        .from("shopping_items")
        .insert(
          originalItems.map((item) => ({
            list_id: newList.id,
            user_id: user.id,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            unit_price: item.unit_price,
            purchased: false,
            position: item.position,
          })),
        )
        .select()
        .returns<ShoppingItem[]>();

      if (itemsError) {
        setError(getSupabaseMessage(itemsError, "A lista foi criada, mas os itens não foram copiados."));
      } else {
        insertedItems = data ?? [];
      }
    }

    setLists((current) => [newList, ...current]);
    setItems((current) => [...current, ...insertedItems]);
    setSelectedListId(newList.id);
    setBusy(false);
  }

  async function addItem(payload: {
    name: string;
    quantity: string | null;
    category: Category;
    unit_price: number | null;
  }) {
    if (!supabase || !selectedListId) {
      return;
    }

    setBusy(true);
    setError("");

    const listItems = items.filter((item) => item.list_id === selectedListId);
    const nextPosition =
      listItems.length === 0 ? 0 : Math.max(...listItems.map((item) => item.position)) + 1;

    const { data, error: insertError } = await supabase
      .from("shopping_items")
      .insert({
        list_id: selectedListId,
        user_id: user.id,
        name: payload.name,
        quantity: payload.quantity,
        unit_price: payload.unit_price,
        category: payload.category,
        purchased: false,
        position: nextPosition,
      })
      .select()
      .single<ShoppingItem>();

    if (insertError || !data) {
      setError(getSupabaseMessage(insertError, "Não foi possível salvar o item."));
    } else {
      setItems((current) => [...current, data]);
      await ensureCategoriesInList(selectedListId, [payload.category]);
      await touchList(selectedListId);
    }

    setBusy(false);
  }

  async function importInvoiceItems(
    importedItems: Array<{
      name: string;
      quantity: string | null;
      category: Category;
      unit_price: number | null;
    }>,
  ) {
    if (!supabase || !selectedListId || importedItems.length === 0) {
      return;
    }

    setBusy(true);
    setError("");

    const listItems = items.filter((item) => item.list_id === selectedListId);
    const basePosition =
      listItems.length === 0 ? 0 : Math.max(...listItems.map((item) => item.position)) + 1;

    const { data, error: insertError } = await supabase
      .from("shopping_items")
      .insert(
        importedItems.map((item, index) => ({
          list_id: selectedListId,
          user_id: user.id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          category: item.category,
          purchased: false,
          position: basePosition + index,
        })),
      )
      .select()
      .returns<ShoppingItem[]>();

    if (insertError) {
      setError(getSupabaseMessage(insertError, "Não foi possível importar os itens da nota."));
    } else {
      setItems((current) => [...current, ...(data ?? [])]);
      await ensureCategoriesInList(
        selectedListId,
        importedItems.map((item) => item.category),
      );
      await touchList(selectedListId);
    }

    setBusy(false);
  }

  async function toggleItem(item: ShoppingItem) {
    if (!supabase) {
      return;
    }

    setBusy(true);
    setError("");

    const { data, error: updateError } = await supabase
      .from("shopping_items")
      .update({ purchased: !item.purchased })
      .eq("id", item.id)
      .select()
      .single<ShoppingItem>();

    if (updateError || !data) {
      setError(getSupabaseMessage(updateError, "Não foi possível atualizar o item."));
    } else {
      setItems((current) => current.map((row) => (row.id === data.id ? data : row)));
      await touchList(item.list_id);
    }

    setBusy(false);
  }

  async function editItem(
    item: ShoppingItem,
    payload: { name: string; quantity: string | null; category: Category; unit_price: number | null },
  ) {
    if (!supabase) {
      return;
    }

    setBusy(true);
    setError("");

    const { data, error: updateError } = await supabase
      .from("shopping_items")
      .update(payload)
      .eq("id", item.id)
      .select()
      .single<ShoppingItem>();

    if (updateError || !data) {
      setError(getSupabaseMessage(updateError, "Não foi possível editar o item."));
    } else {
      setItems((current) => current.map((row) => (row.id === data.id ? data : row)));
      await ensureCategoriesInList(item.list_id, [payload.category]);
      await touchList(item.list_id);
    }

    setBusy(false);
  }

  async function bulkMoveItems(targetItems: ShoppingItem[], category: Category) {
    if (!supabase || targetItems.length === 0) {
      return;
    }

    setBusy(true);
    setError("");

    const itemIds = targetItems.map((item) => item.id);
    const listId = targetItems[0].list_id;

    const { data, error: updateError } = await supabase
      .from("shopping_items")
      .update({ category })
      .in("id", itemIds)
      .select()
      .returns<ShoppingItem[]>();

    if (updateError) {
      setError(getSupabaseMessage(updateError, "Não foi possível mover os itens selecionados."));
    } else {
      const updatedItems = data ?? [];
      setItems((current) =>
        current.map((item) => updatedItems.find((updatedItem) => updatedItem.id === item.id) ?? item),
      );
      await ensureCategoriesInList(listId, [category]);
      await touchList(listId);
    }

    setBusy(false);
  }

  async function bulkTransferItems(
    targetItems: ShoppingItem[],
    targetList: ShoppingList,
    mode: "copy" | "move",
  ) {
    if (!supabase || targetItems.length === 0) {
      return;
    }

    setBusy(true);
    setError("");

    const targetListItems = items.filter((item) => item.list_id === targetList.id);
    const basePosition =
      targetListItems.length === 0 ? 0 : Math.max(...targetListItems.map((item) => item.position)) + 1;
    const sourceListId = targetItems[0].list_id;

    const { data: insertedItems, error: insertError } = await supabase
      .from("shopping_items")
      .insert(
        targetItems.map((item, index) => ({
          list_id: targetList.id,
          user_id: user.id,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit_price: item.unit_price,
          purchased: false,
          position: basePosition + index,
        })),
      )
      .select()
      .returns<ShoppingItem[]>();

    if (insertError) {
      setError(getSupabaseMessage(insertError, "Não foi possível copiar os itens para a lista escolhida."));
      setBusy(false);
      return;
    }

    let movedItemIds = new Set<string>();

    if (mode === "move") {
      const itemIds = targetItems.map((item) => item.id);
      const { error: deleteError } = await supabase.from("shopping_items").delete().in("id", itemIds);

      if (deleteError) {
        setError(getSupabaseMessage(deleteError, "Os itens foram copiados, mas não consegui remover da lista original."));
      } else {
        movedItemIds = new Set(itemIds);
      }
    }

    setItems((current) => [
      ...current.filter((item) => !movedItemIds.has(item.id)),
      ...(insertedItems ?? []),
    ]);
    await ensureCategoriesInList(
      targetList.id,
      targetItems.map((item) => item.category),
    );
    await touchList(targetList.id);

    if (mode === "move") {
      await touchList(sourceListId);
    }

    setBusy(false);
  }

  async function deleteItem(item: ShoppingItem) {
    if (!supabase) {
      return;
    }

    setBusy(true);
    setError("");

    const { error: deleteError } = await supabase.from("shopping_items").delete().eq("id", item.id);

    if (deleteError) {
      setError(getSupabaseMessage(deleteError, "Não foi possível excluir o item."));
    } else {
      setItems((current) => current.filter((row) => row.id !== item.id));
      await touchList(item.list_id);
    }

    setBusy(false);
  }

  async function moveItem(item: ShoppingItem, direction: "up" | "down") {
    if (!supabase) {
      return;
    }

    const peers = sortItems(
      items.filter((row) => row.list_id === item.list_id && row.category === item.category),
    );
    const index = peers.findIndex((row) => row.id === item.id);
    const target = direction === "up" ? peers[index - 1] : peers[index + 1];

    if (!target) {
      return;
    }

    setBusy(true);
    setError("");

    const { error: firstError } = await supabase
      .from("shopping_items")
      .update({ position: target.position })
      .eq("id", item.id);

    const { error: secondError } = await supabase
      .from("shopping_items")
      .update({ position: item.position })
      .eq("id", target.id);

    if (firstError || secondError) {
      setError(getSupabaseMessage(firstError ?? secondError, "Não foi possível reorganizar os itens."));
    } else {
      setItems((current) =>
        current.map((row) => {
          if (row.id === item.id) {
            return { ...row, position: target.position };
          }
          if (row.id === target.id) {
            return { ...row, position: item.position };
          }
          return row;
        }),
      );
      await touchList(item.list_id);
    }

    setBusy(false);
  }

  async function uncheckAll() {
    if (!supabase || !selectedListId) {
      return;
    }

    setBusy(true);
    setError("");

    const { error: updateError } = await supabase
      .from("shopping_items")
      .update({ purchased: false })
      .eq("list_id", selectedListId);

    if (updateError) {
      setError(getSupabaseMessage(updateError, "Não foi possível desmarcar os itens."));
    } else {
      setItems((current) =>
        current.map((item) =>
          item.list_id === selectedListId ? { ...item, purchased: false } : item,
        ),
      );
      await touchList(selectedListId);
    }

    setBusy(false);
  }

  async function clearPurchased(list: ShoppingList) {
    if (!supabase) {
      return;
    }

    setBusy(true);
    setError("");

    const { error: deleteError } = await supabase
      .from("shopping_items")
      .delete()
      .eq("list_id", list.id)
      .eq("purchased", true);

    if (deleteError) {
      setError(getSupabaseMessage(deleteError, "Não foi possível remover os comprados."));
    } else {
      setItems((current) => current.filter((item) => item.list_id !== list.id || !item.purchased));
      await touchList(list.id);
      setConfirm(null);
    }

    setBusy(false);
  }

  async function archiveList(list: ShoppingList, archived: boolean) {
    if (!supabase) {
      return;
    }

    setBusy(true);
    setError("");

    const { data, error: updateError } = await supabase
      .from("shopping_lists")
      .update({ archived })
      .eq("id", list.id)
      .select()
      .single<ShoppingList>();

    if (updateError || !data) {
      setError(getSupabaseMessage(updateError, "Não foi possível atualizar o arquivamento."));
    } else {
      setLists((current) => current.map((item) => (item.id === data.id ? data : item)));
      setDashboardView(archived ? "archived" : "active");
      if (selectedListId === list.id) {
        setSelectedListId(null);
      }
    }

    setBusy(false);
  }

  async function finishList(list: ShoppingList) {
    if (!supabase) {
      return;
    }

    setBusy(true);
    setError("");

    const { data, error: updateError } = await supabase
      .from("shopping_lists")
      .update({ completed_at: new Date().toISOString(), archived: true })
      .eq("id", list.id)
      .select()
      .single<ShoppingList>();

    if (updateError || !data) {
      setError(getSupabaseMessage(updateError, "Não foi possível finalizar a compra."));
    } else {
      setLists((current) => current.map((item) => (item.id === data.id ? data : item)));
      setDashboardView("history");
      setSelectedListId(null);
      setConfirm(null);
    }

    setBusy(false);
  }

  async function copyShareLink(list: ShoppingList) {
    const shareUrl = `${window.location.origin}/?share=${list.share_token}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice("Link copiado. Envie pelo WhatsApp ou outro app de mensagem.");
    } catch {
      setNotice(`Copie este link: ${shareUrl}`);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <ShoppingCart size={21} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-950">Mercado Rápido</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <LogOut size={17} aria-hidden="true" />
            Sair
          </button>
        </div>
      </header>

      {selectedList ? (
        <ShoppingListView
          list={selectedList}
          lists={lists}
          items={selectedItems}
          collaborators={collaboratorsByList[selectedList.id] ?? []}
          currentUserId={user.id}
          busy={busy}
          error={error}
          onBack={() => setSelectedListId(null)}
          onRename={renameList}
          onAddItem={addItem}
          onToggleItem={(item) => void toggleItem(item)}
          onEditItem={editItem}
          onDeleteItem={(item) => void deleteItem(item)}
          onMoveItem={(item, direction) => void moveItem(item, direction)}
          onBulkMoveItems={bulkMoveItems}
          onBulkTransferItems={bulkTransferItems}
          onClearPurchased={() => setConfirm({ type: "clear-purchased", list: selectedList })}
          onUncheckAll={() => void uncheckAll()}
          onDuplicateList={(list) => void duplicateList(list)}
          onDeleteList={(list) => setConfirm({ type: "delete-list", list })}
          onArchiveList={(list, archived) => void archiveList(list, archived)}
          onFinishList={(list) => setConfirm({ type: "finish-list", list })}
          onShareList={(list) => void copyShareLink(list)}
          onUpdateCategoryOrder={updateCategoryOrder}
          onImportInvoice={importInvoiceItems}
        />
      ) : (
        <ListDashboard
          lists={lists}
          statsByList={statsByList}
          collaboratorsByList={collaboratorsByList}
          currentUserId={user.id}
          view={dashboardView}
          loading={loading}
          busy={busy || loading}
          error={error}
          notice={notice}
          onChangeView={setDashboardView}
          onCreateList={() => void createList()}
          onOpenList={setSelectedListId}
          onDuplicateList={(list) => void duplicateList(list)}
          onDeleteList={(list) => setConfirm({ type: "delete-list", list })}
          onArchiveList={(list, archived) => void archiveList(list, archived)}
        />
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm?.type === "delete-list"
            ? "Excluir lista"
            : confirm?.type === "finish-list"
              ? "Finalizar compra"
              : "Remover comprados"
        }
        description={
          confirm?.type === "delete-list"
            ? "Tem certeza que deseja excluir esta lista? Essa ação não pode ser desfeita."
            : confirm?.type === "finish-list"
              ? "Finalizar esta compra e enviar a lista para o histórico? Ela ficará arquivada para comparação."
              : "Remover todos os itens comprados desta lista? Essa ação não pode ser desfeita."
        }
        confirmLabel={
          confirm?.type === "delete-list"
            ? "Excluir"
            : confirm?.type === "finish-list"
              ? "Finalizar"
              : "Remover"
        }
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.type === "delete-list") {
            void deleteList(confirm.list);
          }
          if (confirm?.type === "clear-purchased") {
            void clearPurchased(confirm.list);
          }
          if (confirm?.type === "finish-list") {
            void finishList(confirm.list);
          }
        }}
      />
    </main>
  );
}

function getNextListPosition(lists: ShoppingList[]) {
  if (lists.length === 0) {
    return 0;
  }

  return Math.max(...lists.map((list) => list.position)) + 1;
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
