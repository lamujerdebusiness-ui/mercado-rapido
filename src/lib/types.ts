export type Category =
  | "Hortifruti"
  | "Padaria"
  | "Carnes"
  | "Frios e Laticínios"
  | "Mercearia"
  | "Bebidas"
  | "Higiene"
  | "Limpeza"
  | "Pet"
  | "Outros";

export type ShoppingList = {
  id: string;
  user_id: string;
  name: string;
  position: number;
  archived: boolean;
  completed_at: string | null;
  share_token: string;
  share_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type ShoppingItem = {
  id: string;
  list_id: string;
  user_id: string;
  name: string;
  category: Category;
  quantity: string | null;
  unit_price: number | null;
  purchased: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

export type ListStats = {
  total: number;
  purchased: number;
  pending: number;
  estimatedTotal: number;
  purchasedTotal: number;
};

export type DashboardView = "active" | "archived" | "history";
