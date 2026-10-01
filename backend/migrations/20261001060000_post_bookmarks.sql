-- Apply to the same Supabase project that hosts posts and public.user_id().
begin;

create table if not exists public.post_bookmarks (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists post_bookmarks_user_created_idx
  on public.post_bookmarks(user_id, created_at desc);
alter table public.post_bookmarks enable row level security;
revoke all on public.post_bookmarks from anon, authenticated;
grant select on public.post_bookmarks to anon, authenticated;
drop policy if exists post_bookmarks_read_own on public.post_bookmarks;
create policy post_bookmarks_read_own on public.post_bookmarks
  for select to anon, authenticated using (user_id = public.user_id());

create or replace function public.get_post_bookmarks(expected_user_id text)
returns table(post_id uuid, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
declare caller text := public.user_id();
begin
  if caller is null or caller = '' or caller is distinct from expected_user_id then
    raise exception 'Login required' using errcode = '42501';
  end if;
  return query select b.post_id, b.created_at from public.post_bookmarks b
    where b.user_id = caller order by b.created_at desc, b.post_id;
end;
$$;

create or replace function public.set_post_bookmark(
  target_post_id uuid, saved boolean, expected_user_id text
)
returns table(post_id uuid, created_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare caller text := public.user_id();
begin
  if caller is null or caller = '' or caller is distinct from expected_user_id then
    raise exception 'Login required' using errcode = '42501';
  end if;
  if saved is null then
    raise exception 'saved must be true or false' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller, 0));
  if saved then
    perform 1 from public.posts p where p.id = target_post_id for key share;
    if not found then
      raise exception 'Post not found' using errcode = 'P0002';
    end if;
    insert into public.post_bookmarks(post_id, user_id)
      values (target_post_id, caller) on conflict do nothing;
  else
    delete from public.post_bookmarks b where b.post_id = target_post_id and b.user_id = caller;
  end if;
  return query select * from public.get_post_bookmarks(caller);
end;
$$;

create or replace function public.import_post_bookmarks(
  post_ids uuid[], expected_user_id text
)
returns table(post_id uuid, created_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare caller text := public.user_id();
begin
  if caller is null or caller = '' or caller is distinct from expected_user_id then
    raise exception 'Login required' using errcode = '42501';
  end if;
  if coalesce(cardinality(post_ids), 0) > 500 then
    raise exception 'Import at most 500 bookmarks per request' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller, 0));
  insert into public.post_bookmarks(post_id, user_id, created_at)
    select p.id, caller, pg_catalog.statement_timestamp() - (requested.position * interval '1 microsecond')
    from unnest(post_ids) with ordinality as requested(id, position)
    join public.posts p on p.id = requested.id
    order by requested.position
    on conflict do nothing;
  return query select * from public.get_post_bookmarks(caller);
end;
$$;

revoke all on function public.get_post_bookmarks(text) from public;
revoke all on function public.set_post_bookmark(uuid, boolean, text) from public;
revoke all on function public.import_post_bookmarks(uuid[], text) from public;
grant execute on function public.get_post_bookmarks(text) to anon, authenticated;
grant execute on function public.set_post_bookmark(uuid, boolean, text) to anon, authenticated;
grant execute on function public.import_post_bookmarks(uuid[], text) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
