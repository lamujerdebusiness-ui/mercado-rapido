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

drop policy if exists "Users can select accessible lists" on public.shopping_lists;
create policy "Users can select accessible lists"
on public.shopping_lists
for select
using (
  auth.uid() = user_id
  or public.is_list_collaborator(id)
);

drop policy if exists "Users can select collaborators for accessible lists" on public.shopping_list_collaborators;
create policy "Users can select own collaborator rows"
on public.shopping_list_collaborators
for select
using (auth.uid() = user_id);
