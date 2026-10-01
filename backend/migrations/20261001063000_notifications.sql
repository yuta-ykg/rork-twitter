-- Apply after post_likes and profiles in the connected Rork Cloud database.
begin;
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id text not null,
  actor_id text not null,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (post_id, actor_id),
  foreign key (post_id, actor_id) references public.post_likes(post_id, user_id) on delete cascade
);
create index if not exists notifications_recipient_created_idx on public.notifications(recipient_id, created_at desc, id desc);
create index if not exists notifications_unread_idx on public.notifications(recipient_id) where read_at is null;
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to anon, authenticated;
drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own on public.notifications for select to anon, authenticated
using (recipient_id = public.user_id());

create or replace function public.notify_post_like()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare recipient text;
begin
  select p.user_id::text into recipient from public.posts p where p.id = new.post_id;
  if recipient is not null and recipient <> '' and recipient <> new.user_id then
    insert into public.notifications(recipient_id, actor_id, post_id)
    values(recipient, new.user_id, new.post_id) on conflict(post_id, actor_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.notify_post_like() from public, anon, authenticated;
drop trigger if exists notify_post_like_insert on public.post_likes;
create trigger notify_post_like_insert after insert on public.post_likes for each row execute function public.notify_post_like();

create or replace function public.get_notifications(
  expected_user_id text, before_created_at timestamptz default null, before_id uuid default null
)
returns table(id uuid, post_id uuid, actor_id text, actor_name text, post_body text,
  created_at timestamptz, read_at timestamptz, unread_count bigint)
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
  return query select n.id, n.post_id, n.actor_id, coalesce(nullif(p.name,''),'ユーザー'), t.body,
    n.created_at, n.read_at,
    (select count(*) from public.notifications u where u.recipient_id = caller and u.read_at is null)
  from public.notifications n
  join public.posts t on t.id = n.post_id
  left join public.profiles p on p.id::text = n.actor_id
  where n.recipient_id = caller and (before_created_at is null or (n.created_at,n.id) < (before_created_at,before_id))
  order by n.created_at desc, n.id desc limit 50;
end;
$$;

create or replace function public.mark_notifications_read(notification_ids uuid[], expected_user_id text)
returns void language plpgsql security definer set search_path = ''
as $$
declare caller text := public.user_id();
begin
  if caller is null or caller = '' or caller is distinct from expected_user_id then
    raise exception 'Login required' using errcode = '42501';
  end if;
  if coalesce(cardinality(notification_ids),0) > 100 then
    raise exception 'Too many notifications' using errcode = '22023';
  end if;
  update public.notifications n set read_at = now()
    where n.recipient_id = caller and n.id = any(notification_ids) and n.read_at is null;
end;
$$;

create or replace function public.mark_all_notifications_read(before_time timestamptz, expected_user_id text)
returns void language plpgsql security definer set search_path = ''
as $$
declare caller text := public.user_id();
begin
  if caller is null or caller = '' or caller is distinct from expected_user_id then
    raise exception 'Login required' using errcode = '42501';
  end if;
  if before_time is null then raise exception 'Timestamp required' using errcode = '22023'; end if;
  update public.notifications n set read_at = now()
    where n.recipient_id = caller and n.created_at <= before_time and n.read_at is null;
end;
$$;
revoke all on function public.get_notifications(text,timestamptz,uuid) from public;
revoke all on function public.mark_notifications_read(uuid[],text) from public;
revoke all on function public.mark_all_notifications_read(timestamptz,text) from public;
grant execute on function public.get_notifications(text,timestamptz,uuid) to anon, authenticated;
grant execute on function public.mark_notifications_read(uuid[],text) to anon, authenticated;
grant execute on function public.mark_all_notifications_read(timestamptz,text) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
