-- Apply after the notifications migration.
begin;
drop function if exists public.get_notifications(text,timestamptz,uuid);
create function public.get_notifications(
  expected_user_id text, before_created_at timestamptz default null, before_id uuid default null
)
returns table(id uuid, post_id uuid, post_body text, created_at timestamptz,
  read_at timestamptz, like_count bigint, unread_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
declare caller text := public.user_id();
begin
  if caller is null or caller = '' or caller is distinct from expected_user_id then
    raise exception 'Login required' using errcode = '42501';
  end if;
  if (before_created_at is null) <> (before_id is null) then
    raise exception 'Invalid cursor' using errcode = '22023';
  end if;
  return query
  with grouped as (
    select n.post_id, max(n.created_at) as latest_at,
      bool_or(n.read_at is null) as unread,
      case when bool_or(n.read_at is null) then null else max(n.read_at) end as read_at
    from public.notifications n where n.recipient_id = caller group by n.post_id
  )
  select g.post_id, g.post_id, p.body, g.latest_at, g.read_at,
    (select count(*) from public.post_likes l where l.post_id = g.post_id and l.user_id <> caller),
    (select count(*) from grouped u where u.unread)
  from grouped g join public.posts p on p.id = g.post_id
  where before_created_at is null or (g.latest_at,g.post_id) < (before_created_at,before_id)
  order by g.latest_at desc, g.post_id desc limit 50;
end;
$$;

create or replace function public.mark_post_notifications_read(
  target_post_id uuid, before_time timestamptz, expected_user_id text
)
returns void language plpgsql security definer set search_path = ''
as $$
declare caller text := public.user_id();
begin
  if caller is null or caller = '' or caller is distinct from expected_user_id then
    raise exception 'Login required' using errcode = '42501';
  end if;
  if before_time is null then raise exception 'Timestamp required' using errcode = '22023'; end if;
  -- Only the likes represented by the displayed group are marked as read.
  update public.notifications n set read_at = now()
    where n.recipient_id = caller and n.post_id = target_post_id
      and n.created_at <= before_time and n.read_at is null;
end;
$$;
revoke all on function public.get_notifications(text,timestamptz,uuid) from public;
revoke all on function public.mark_post_notifications_read(uuid,timestamptz,text) from public;
grant execute on function public.get_notifications(text,timestamptz,uuid) to anon, authenticated;
grant execute on function public.mark_post_notifications_read(uuid,timestamptz,text) to anon, authenticated;
notify pgrst, 'reload schema';
commit;

