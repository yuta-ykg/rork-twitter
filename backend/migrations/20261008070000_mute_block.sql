-- Mute hides an account's posts from the viewer. Block hides posts in both directions.
create table if not exists public.user_relationships (
  user_id text not null,
  target_id text not null,
  kind text not null check (kind in ('mute','block')),
  created_at timestamptz not null default now(),
  primary key (user_id, target_id, kind),
  check (user_id <> target_id and target_id <> '')
);
create index if not exists user_relationships_target_idx on public.user_relationships(target_id, user_id, kind);
alter table public.user_relationships enable row level security;
revoke all on public.user_relationships from anon, authenticated;

create or replace function public.can_view_account(viewer_id text, author_id text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select viewer_id is null or viewer_id = '' or author_id is null or viewer_id = author_id
    or not exists (
      select 1 from public.user_relationships r
      where (r.user_id = viewer_id and r.target_id = author_id)
         or (r.kind = 'block' and r.user_id = author_id and r.target_id = viewer_id)
    );
$$;
revoke all on function public.can_view_account(text, text) from public, anon, authenticated;

create or replace function public.get_visible_posts(expected_user_id text default null)
returns setof public.posts
language plpgsql stable security definer set search_path = ''
as $$
declare caller text := public.user_id();
begin
  if caller is null or caller = '' or caller is distinct from expected_user_id then
    raise exception 'Login required' using errcode = '42501';
  end if;
  return query
    select p.* from public.posts p
    where public.can_view_account(caller, p.user_id::text)
    order by p.created_at desc;
end;
$$;

create or replace function public.set_user_relationship(target_user_id text, relation_kind text, active boolean, expected_user_id text)
returns table (is_muted boolean, is_blocked boolean)
language plpgsql security definer set search_path = ''
as $$
declare caller text := public.user_id();
begin
  if caller is null or caller = '' or caller is distinct from expected_user_id then
    raise exception 'Login required' using errcode = '42501';
  end if;
  if target_user_id is null or target_user_id = '' or target_user_id = caller
     or relation_kind not in ('mute','block') or active is null then
    raise exception 'Invalid relationship' using errcode = '22023';
  end if;
  if active then
    insert into public.user_relationships(user_id, target_id, kind)
    values (caller, target_user_id, relation_kind) on conflict do nothing;
  else
    delete from public.user_relationships r
    where r.user_id = caller and r.target_id = target_user_id and r.kind = relation_kind;
  end if;
  return query select
    exists(select 1 from public.user_relationships r where r.user_id = caller and r.target_id = target_user_id and r.kind = 'mute'),
    exists(select 1 from public.user_relationships r where r.user_id = caller and r.target_id = target_user_id and r.kind = 'block');
end;
$$;

create or replace function public.list_user_relationships(expected_user_id text)
returns table (target_id text, kind text, target_name text, target_handle text)
language plpgsql stable security definer set search_path = ''
as $$
declare caller text := public.user_id();
begin
  if caller is null or caller = '' or caller is distinct from expected_user_id then
    raise exception 'Login required' using errcode = '42501';
  end if;
  return query
    select r.target_id, r.kind, coalesce(nullif(p.name, ''), 'ユーザー'), p.handle
    from public.user_relationships r
    left join public.profiles p on p.id::text = r.target_id
    where r.user_id = caller
    order by r.created_at desc, r.target_id, r.kind;
end;
$$;

revoke all on function public.get_visible_posts(text) from public;
revoke all on function public.set_user_relationship(text, text, boolean, text) from public;
revoke all on function public.list_user_relationships(text) from public;
grant execute on function public.get_visible_posts(text) to anon, authenticated;
grant execute on function public.set_user_relationship(text, text, boolean, text) to anon, authenticated;
grant execute on function public.list_user_relationships(text) to anon, authenticated;
notify pgrst, 'reload schema';
