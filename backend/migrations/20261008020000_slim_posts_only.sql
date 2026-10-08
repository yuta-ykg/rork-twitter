-- Applied to the live database. Keeps posts, profiles, and the four RPCs the apps call.
-- Reply rows are deleted before parent_id is dropped so they do not become ordinary posts.

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname not in ('user_id', 'ensure_profile')
  loop
    execute format('drop function if exists %s cascade', fn.signature);
  end loop;
end
$$;

drop table if exists
  public.post_poll_response_options,
  public.post_poll_responses,
  public.post_poll_options,
  public.post_polls,
  public.post_diagnosis_links,
  public.user_diagnoses,
  public.community_posts,
  public.community_members,
  public.communities,
  public.shogi_rooms,
  public.user_list_members,
  public.user_lists,
  public.notifications,
  public.post_bookmarks,
  public.post_likes,
  public.user_relationships
cascade;

delete from public.posts where parent_id is not null;
alter table public.posts drop column if exists parent_id;

create or replace function public.get_visible_posts(expected_user_id text default null)
returns setof public.posts
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller text := public.user_id();
begin
  if caller is null or caller = '' or caller is distinct from expected_user_id then
    raise exception 'Login required' using errcode = '42501';
  end if;
  return query
    select p.* from public.posts p
    order by p.created_at desc;
end;
$$;

create or replace function public.create_post(post_id uuid, post_body text, expected_user_id text)
returns setof public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller text := public.user_id();
  author_name text;
  author_handle text;
begin
  if caller is null or caller = '' or caller is distinct from expected_user_id then
    raise exception 'Login required' using errcode = '42501';
  end if;
  post_body := btrim(post_body);
  if post_id is null or post_body is null or char_length(post_body) not between 1 and 70 then
    raise exception 'Invalid post' using errcode = '22023';
  end if;
  select coalesce(nullif(p.name, ''), 'ユーザー'), coalesce(p.handle, 'u_' || substr(md5(caller), 1, 16))
    into author_name, author_handle
  from public.profiles p
  where p.id::text = caller;
  author_name := coalesce(author_name, 'ユーザー');
  author_handle := coalesce(author_handle, 'u_' || substr(md5(caller), 1, 16));
  insert into public.posts (id, user_id, body, author_name, handle, initial, is_mine, avatar_index)
  values (post_id, caller, post_body, author_name, '@' || author_handle, left(author_name, 1), true, 0)
  on conflict (id) do nothing;
  if not exists (
    select 1 from public.posts p
    where p.id = post_id and p.user_id::text = caller and p.body = post_body
  ) then
    raise exception 'Post ID already used' using errcode = '23505';
  end if;
  return query select p.* from public.posts p where p.id = post_id;
end;
$$;

create or replace function public.get_public_profiles(profile_ids text[])
returns table (
  id text,
  name text,
  handle text,
  bio text,
  avatar_url text,
  created_at timestamptz,
  post_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id::text,
         coalesce(p.name, 'ユーザー'),
         p.handle,
         p.bio,
         p.avatar_url,
         p.created_at,
         (select count(*) from public.posts t where t.user_id::text = p.id::text)
  from public.profiles p
  where p.id::text = any(profile_ids);
$$;

revoke all on function public.get_visible_posts(text) from public;
revoke all on function public.create_post(uuid, text, text) from public;
revoke all on function public.get_public_profiles(text[]) from public;
grant execute on function public.get_visible_posts(text) to anon, authenticated;
grant execute on function public.create_post(uuid, text, text) to anon, authenticated;
grant execute on function public.get_public_profiles(text[]) to anon, authenticated;
notify pgrst, 'reload schema';
