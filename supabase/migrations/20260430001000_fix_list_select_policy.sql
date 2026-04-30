drop policy if exists "Users can select accessible lists" on public.shopping_lists;
create policy "Users can select accessible lists"
on public.shopping_lists
for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.shopping_list_collaborators
    where shopping_list_collaborators.list_id = shopping_lists.id
    and shopping_list_collaborators.user_id = auth.uid()
  )
);
