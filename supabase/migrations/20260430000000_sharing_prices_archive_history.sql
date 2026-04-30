alter table public.shopping_lists
add column if not exists archived boolean not null default false,
add column if not exists completed_at timestamptz,
add column if not exists share_token uuid not null default gen_random_uuid(),
add column if not exists share_enabled boolean not null default true;

alter table public.shopping_items
add column if not exists unit_price numeric(10, 2);

create unique index if not exists idx_shopping_lists_share_token
on public.shopping_lists(share_token);

create table if not exists public.shopping_list_collaborators (
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor',
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create index if not exists idx_shopping_list_collaborators_user_id
on public.shopping_list_collaborators(user_id);

alter table public.shopping_list_collaborators enable row level security;

create or replace function public.can_access_list(target_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shopping_lists
    where id = target_list_id
    and user_id = auth.uid()
  )
  or exists (
    select 1
    from public.shopping_list_collaborators
    where list_id = target_list_id
    and user_id = auth.uid()
  );
$$;

create or replace function public.accept_list_share(token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_list public.shopping_lists;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select *
  into target_list
  from public.shopping_lists
  where share_token = token
  and share_enabled = true;

  if target_list.id is null then
    raise exception 'share not found';
  end if;

  if target_list.user_id <> auth.uid() then
    insert into public.shopping_list_collaborators (list_id, user_id, role)
    values (target_list.id, auth.uid(), 'editor')
    on conflict (list_id, user_id) do nothing;
  end if;

  return target_list.id;
end;
$$;

drop policy if exists "Users can select collaborators for accessible lists" on public.shopping_list_collaborators;
create policy "Users can select collaborators for accessible lists"
on public.shopping_list_collaborators
for select
using (public.can_access_list(list_id));

drop policy if exists "Owners can manage collaborators" on public.shopping_list_collaborators;
create policy "Owners can manage collaborators"
on public.shopping_list_collaborators
for all
using (
  exists (
    select 1
    from public.shopping_lists
    where shopping_lists.id = shopping_list_collaborators.list_id
    and shopping_lists.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.shopping_lists
    where shopping_lists.id = shopping_list_collaborators.list_id
    and shopping_lists.user_id = auth.uid()
  )
);

drop policy if exists "Users can select own lists" on public.shopping_lists;
create policy "Users can select accessible lists"
on public.shopping_lists
for select
using (public.can_access_list(id));

drop policy if exists "Users can update own lists" on public.shopping_lists;
create policy "Users can update accessible lists"
on public.shopping_lists
for update
using (public.can_access_list(id))
with check (public.can_access_list(id));

drop policy if exists "Users can delete own lists" on public.shopping_lists;
create policy "Users can delete own lists"
on public.shopping_lists
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can select own items" on public.shopping_items;
create policy "Users can select accessible items"
on public.shopping_items
for select
using (public.can_access_list(list_id));

drop policy if exists "Users can insert own items" on public.shopping_items;
create policy "Users can insert accessible items"
on public.shopping_items
for insert
with check (
  auth.uid() = user_id
  and public.can_access_list(list_id)
);

drop policy if exists "Users can update own items" on public.shopping_items;
create policy "Users can update accessible items"
on public.shopping_items
for update
using (public.can_access_list(list_id))
with check (public.can_access_list(list_id));

drop policy if exists "Users can delete own items" on public.shopping_items;
create policy "Users can delete accessible items"
on public.shopping_items
for delete
using (public.can_access_list(list_id));
