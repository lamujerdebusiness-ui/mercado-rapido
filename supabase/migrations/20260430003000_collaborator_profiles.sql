alter table public.shopping_list_collaborators
add column if not exists email text,
add column if not exists display_name text;

update public.shopping_list_collaborators collaborators
set
  email = coalesce(collaborators.email, users.email),
  display_name = coalesce(
    collaborators.display_name,
    nullif(users.raw_user_meta_data ->> 'full_name', ''),
    nullif(users.raw_user_meta_data ->> 'name', ''),
    nullif(users.raw_user_meta_data ->> 'display_name', '')
  )
from auth.users users
where users.id = collaborators.user_id;

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
