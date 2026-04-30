alter table public.shopping_lists
add column if not exists category_order text[] not null default array[
  'Hortifruti',
  'Padaria',
  'Carnes',
  'Frios e Laticínios',
  'Mercearia',
  'Bebidas',
  'Higiene',
  'Limpeza',
  'Pet',
  'Outros'
];
