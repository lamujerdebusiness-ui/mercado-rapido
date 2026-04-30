create extension if not exists "pgcrypto";

create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  archived boolean not null default false,
  completed_at timestamptz,
  share_token uuid not null default gen_random_uuid(),
  share_enabled boolean not null default true,
  category_order text[] not null default array[
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
  ],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'Outros',
  quantity text,
  unit_price numeric(10, 2),
  purchased boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shopping_lists_user_id
on public.shopping_lists(user_id);

create unique index if not exists idx_shopping_lists_share_token
on public.shopping_lists(share_token);

create index if not exists idx_shopping_items_list_id
on public.shopping_items(list_id);

create index if not exists idx_shopping_items_user_id
on public.shopping_items(user_id);

create table if not exists public.shopping_list_collaborators (
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor',
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create index if not exists idx_shopping_list_collaborators_user_id
on public.shopping_list_collaborators(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_shopping_lists_updated_at on public.shopping_lists;
create trigger set_shopping_lists_updated_at
before update on public.shopping_lists
for each row
execute function public.set_updated_at();

drop trigger if exists set_shopping_items_updated_at on public.shopping_items;
create trigger set_shopping_items_updated_at
before update on public.shopping_items
for each row
execute function public.set_updated_at();

alter table public.shopping_lists enable row level security;
alter table public.shopping_items enable row level security;
alter table public.shopping_list_collaborators enable row level security;

create or replace function public.is_list_collaborator(target_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shopping_list_collaborators
    where list_id = target_list_id
    and user_id = auth.uid()
  );
$$;

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
  or public.is_list_collaborator(target_list_id);
$$;

create or replace function public.accept_list_share(token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_list public.shopping_lists;
  collaborator_email text;
  collaborator_name text;
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

  collaborator_email := nullif(auth.jwt() ->> 'email', '');
  collaborator_name := coalesce(
    nullif(auth.jwt() #>> '{user_metadata,full_name}', ''),
    nullif(auth.jwt() #>> '{user_metadata,name}', ''),
    nullif(auth.jwt() #>> '{user_metadata,display_name}', '')
  );

  if target_list.user_id <> auth.uid() then
    insert into public.shopping_list_collaborators (list_id, user_id, role, email, display_name)
    values (target_list.id, auth.uid(), 'editor', collaborator_email, collaborator_name)
    on conflict (list_id, user_id) do update
    set
      email = coalesce(excluded.email, shopping_list_collaborators.email),
      display_name = coalesce(excluded.display_name, shopping_list_collaborators.display_name);
  end if;

  return target_list.id;
end;
$$;

create or replace function public.get_accessible_list_collaborators()
returns table (
  list_id uuid,
  user_id uuid,
  role text,
  email text,
  display_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    collaborators.list_id,
    collaborators.user_id,
    collaborators.role,
    collaborators.email,
    collaborators.display_name,
    collaborators.created_at
  from public.shopping_list_collaborators collaborators
  where auth.uid() is not null
  and (
    exists (
      select 1
      from public.shopping_lists lists
      where lists.id = collaborators.list_id
      and lists.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.shopping_list_collaborators own_access
      where own_access.list_id = collaborators.list_id
      and own_access.user_id = auth.uid()
    )
  );
$$;

grant execute on function public.get_accessible_list_collaborators() to authenticated;

drop policy if exists "Users can select collaborators for accessible lists" on public.shopping_list_collaborators;
create policy "Users can select own collaborator rows"
on public.shopping_list_collaborators
for select
using (auth.uid() = user_id);

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
using (
  auth.uid() = user_id
  or public.is_list_collaborator(id)
);

drop policy if exists "Users can insert own lists" on public.shopping_lists;
create policy "Users can insert own lists"
on public.shopping_lists
for insert
with check (auth.uid() = user_id);

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
