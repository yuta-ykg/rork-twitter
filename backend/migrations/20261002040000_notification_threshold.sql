begin;
drop function if exists public.get_notifications(text,timestamptz,uuid);
create function public.get_notifications(expected_user_id text, before_created_at timestamptz default null, before_id uuid default null)
returns table(id uuid, post_id uuid, post_body text, created_at timestamptz, read_at timestamptz,
 like_count bigint, unread_count bigint, actor_name text, is_grouped boolean)
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
   case when bool_or(n.read_at is null) then null else max(n.read_at) end as read_at,
   (select count(*) from public.post_likes l where l.post_id = n.post_id and l.user_id <> caller) as people
  from public.notifications n where n.recipient_id = caller group by n.post_id
 ), displayed as (
  select n.id, n.post_id, n.created_at, n.read_at, g.people, coalesce(nullif(p.name,''),'ユーザー') as actor_name, false as is_grouped
  from public.notifications n join grouped g on g.post_id = n.post_id
  left join public.profiles p on p.id::text = n.actor_id
  where n.recipient_id = caller and g.people <= 20
  union all
  select g.post_id, g.post_id, g.latest_at, g.read_at, g.people, null::text, true
  from grouped g where g.people > 20
 )
 select d.id, d.post_id, p.body, d.created_at, d.read_at, d.people,
  (select count(*) from displayed u where u.read_at is null), d.actor_name, d.is_grouped
 from displayed d join public.posts p on p.id = d.post_id
 where before_created_at is null or (d.created_at,d.id) < (before_created_at,before_id)
 order by d.created_at desc,d.id desc limit 50;
end;
$$;
revoke all on function public.get_notifications(text,timestamptz,uuid) from public;
grant execute on function public.get_notifications(text,timestamptz,uuid) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
