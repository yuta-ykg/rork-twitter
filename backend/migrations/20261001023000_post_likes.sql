-- Apply in the connected Supabase project's SQL Editor.
-- Reuses Rork's existing public.user_id() JWT identity (Apple / Google).
begin;

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_likes enable row level security;
revoke all on public.post_likes from anon, authenticated;
grant select on public.post_likes to anon, authenticated;
drop policy if exists post_likes_read_own on public.post_likes;
create policy post_likes_read_own on public.post_likes
  for select to anon, authenticated
  using (user_id = public.user_id());

create or replace function public.get_post_likes(post_ids uuid[])
returns table(post_id uuid, like_count bigint, is_liked boolean)
language sql stable security definer set search_path = ''
as $$
  select p.id, count(l.user_id),
         coalesce(bool_or(l.user_id = public.user_id()), false)
  from public.posts p
  left join public.post_likes l on l.post_id = p.id
  where p.id = any(post_ids)
  group by p.id;
$$;

create or replace function public.set_post_like(
  target_post_id uuid, liked boolean, expected_user_id text
)
returns table(post_id uuid, like_count bigint, is_liked boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  caller text := public.user_id();
begin
  if caller is null or caller = '' or caller is distinct from expected_user_id then
    raise exception 'Login required' using errcode = '42501';
  end if;
  if liked is null then
    raise exception 'liked must be true or false' using errcode = '22023';
  end if;
  -- Serialize writes per post. Repeated requests are idempotent.
  perform 1 from public.posts p where p.id = target_post_id for update;
  if not found then
    raise exception 'Post not found' using errcode = 'P0002';
  end if;
  if liked then
    insert into public.post_likes(post_id, user_id)
    values (target_post_id, caller) on conflict do nothing;
  else
    delete from public.post_likes l
    where l.post_id = target_post_id and l.user_id = caller;
  end if;
  return query select * from public.get_post_likes(array[target_post_id]);
end;
$$;

revoke all on function public.get_post_likes(uuid[]) from public;
revoke all on function public.set_post_like(uuid, boolean, text) from public;
-- Rork's verified custom JWT may use either API role; identity is checked above.
grant execute on function public.get_post_likes(uuid[]) to anon, authenticated;
grant execute on function public.set_post_like(uuid, boolean, text) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
