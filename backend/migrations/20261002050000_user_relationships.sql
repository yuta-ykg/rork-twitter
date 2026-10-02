-- Mutes hide accounts from the viewer. Blocks hide both directions and deny new interactions.
begin;
create table if not exists public.user_relationships (
  user_id text not null,
  target_id text not null,
  kind text not null check (kind in ('mute','block')),
  created_at timestamptz not null default now(),
  primary key(user_id,target_id,kind),
  check (user_id <> target_id and target_id <> '')
);
create index if not exists user_relationships_target_idx on public.user_relationships(target_id,user_id,kind);
alter table public.user_relationships enable row level security;
revoke all on public.user_relationships from anon,authenticated;
grant select on public.user_relationships to anon,authenticated;
drop policy if exists user_relationships_read_own on public.user_relationships;
create policy user_relationships_read_own on public.user_relationships for select to anon,authenticated using(user_id=public.user_id());

create or replace function public.is_blocked_pair(first_id text,second_id text)
returns boolean language sql stable security definer set search_path=''
as $$
 select first_id is not null and second_id is not null and exists(
   select 1 from public.user_relationships r where r.kind='block'
   and ((r.user_id=first_id and r.target_id=second_id) or (r.user_id=second_id and r.target_id=first_id))
 );
$$;
create or replace function public.can_view_account(viewer_id text,author_id text)
returns boolean language sql stable security definer set search_path=''
as $$
 select viewer_id is null or viewer_id='' or author_id is null or viewer_id=author_id
   or (not public.is_blocked_pair(viewer_id,author_id) and not exists(
     select 1 from public.user_relationships r where r.user_id=viewer_id and r.target_id=author_id and r.kind='mute'
   ));
$$;
revoke all on function public.is_blocked_pair(text,text) from public,anon,authenticated;
revoke all on function public.can_view_account(text,text) from public,anon,authenticated;

create or replace function public.get_user_relationship(target_user_id text,expected_user_id text)
returns table(is_muted boolean,is_blocked boolean)
language plpgsql stable security definer set search_path=''
as $$
declare caller text:=public.user_id();
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then
  raise exception 'Login required' using errcode='42501';
 end if;
 return query select
  exists(select 1 from public.user_relationships r where r.user_id=caller and r.target_id=target_user_id and r.kind='mute'),
  exists(select 1 from public.user_relationships r where r.user_id=caller and r.target_id=target_user_id and r.kind='block');
end;
$$;
create or replace function public.list_user_relationships(expected_user_id text)
returns table(target_id text,kind text,target_name text,target_handle text)
language plpgsql stable security definer set search_path=''
as $$
declare caller text:=public.user_id();
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then
  raise exception 'Login required' using errcode='42501';
 end if;
 return query select r.target_id,r.kind,coalesce(nullif(p.name,''),r.target_id),p.handle
  from public.user_relationships r left join public.profiles p on p.id::text=r.target_id
  where r.user_id=caller order by r.created_at desc,r.target_id,r.kind;
end;
$$;
create or replace function public.set_user_relationship(target_user_id text,relation_kind text,active boolean,expected_user_id text)
returns table(is_muted boolean,is_blocked boolean)
language plpgsql security definer set search_path=''
as $$
declare caller text:=public.user_id();
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then
  raise exception 'Login required' using errcode='42501';
 end if;
 if target_user_id is null or target_user_id='' or target_user_id=caller or relation_kind not in ('mute','block') or active is null then
  raise exception 'Invalid relationship' using errcode='22023';
 end if;
 if active then
  insert into public.user_relationships(user_id,target_id,kind) values(caller,target_user_id,relation_kind) on conflict do nothing;
 else
  delete from public.user_relationships r where r.user_id=caller and r.target_id=target_user_id and r.kind=relation_kind;
 end if;
 return query select * from public.get_user_relationship(target_user_id,caller);
end;
$$;

create or replace function public.get_visible_posts(expected_user_id text default null)
returns setof public.posts language plpgsql stable security definer set search_path=''
as $$
declare caller text:=public.user_id();
begin
 if caller is distinct from expected_user_id and not (caller is null and expected_user_id is null) then
  raise exception 'Login required' using errcode='42501';
 end if;
 return query with recursive visible as (
  select p.* from public.posts p where p.parent_id is null and public.can_view_account(caller,p.user_id::text)
  union all
  select child.* from public.posts child join visible parent on child.parent_id=parent.id
    where public.can_view_account(caller,child.user_id::text)
 )
 select visible.* from visible order by visible.created_at desc;
end;
$$;

create or replace function public.get_public_profiles(profile_ids text[])
returns table(id text,name text,handle text,bio text,avatar_url text,created_at timestamptz,post_count bigint)
language sql stable security definer set search_path=''
as $$
 select p.id::text,coalesce(p.name,'ユーザー'),p.handle,p.bio,p.avatar_url,p.created_at,
   (select count(*) from public.posts t where t.user_id::text=p.id::text)
 from public.profiles p where p.id::text=any(profile_ids)
 and not public.is_blocked_pair(public.user_id(),p.id::text);
$$;

create or replace function public.set_post_like(target_post_id uuid,liked boolean,expected_user_id text)
returns table(post_id uuid,like_count bigint,is_liked boolean)
language plpgsql security definer set search_path=''
as $$
declare caller text:=public.user_id(); author_id text;
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then raise exception 'Login required' using errcode='42501'; end if;
 if liked is null then raise exception 'liked must be true or false' using errcode='22023'; end if;
 select p.user_id::text into author_id from public.posts p where p.id=target_post_id for update;
 if not found then raise exception 'Post not found' using errcode='P0002'; end if;
 if liked and public.is_blocked_pair(caller,author_id) then raise exception 'Blocked account' using errcode='42501'; end if;
 if liked then
  insert into public.post_likes(post_id,user_id) values(target_post_id,caller) on conflict do nothing;
 else
  delete from public.post_likes l where l.post_id=target_post_id and l.user_id=caller;
 end if;
 return query select * from public.get_post_likes(array[target_post_id]);
end;
$$;

create or replace function public.set_post_bookmark(target_post_id uuid,saved boolean,expected_user_id text)
returns table(post_id uuid,created_at timestamptz)
language plpgsql security definer set search_path=''
as $$
declare caller text:=public.user_id();author_id text;
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then raise exception 'Login required' using errcode='42501'; end if;
 if saved is null then raise exception 'saved must be true or false' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller,0));
 if saved then
  select p.user_id::text into author_id from public.posts p where p.id=target_post_id for key share;
  if not found then raise exception 'Post not found' using errcode='P0002'; end if;
  if public.is_blocked_pair(caller,author_id) then raise exception 'Blocked account' using errcode='42501'; end if;
  insert into public.post_bookmarks(post_id,user_id) values(target_post_id,caller) on conflict do nothing;
 else
  delete from public.post_bookmarks b where b.post_id=target_post_id and b.user_id=caller;
 end if;
 return query select * from public.get_post_bookmarks(caller);
end;
$$;

create or replace function public.create_reply(reply_id uuid,target_post_id uuid,reply_body text,expected_user_id text)
returns setof public.posts language plpgsql security definer set search_path=''
as $$
declare caller text:=public.user_id();author_name text;author_handle text;target_author text;
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then raise exception 'Login required' using errcode='42501'; end if;
 reply_body:=btrim(reply_body);
 if reply_id is null or target_post_id is null or reply_id=target_post_id or reply_body is null or char_length(reply_body) not between 1 and 70 then
  raise exception 'Invalid reply' using errcode='22023';
 end if;
 select p.user_id::text into target_author from public.posts p where p.id=target_post_id for key share;
 if not found then raise exception 'Post not found' using errcode='P0002'; end if;
 if public.is_blocked_pair(caller,target_author) then raise exception 'Blocked account' using errcode='42501'; end if;
 select coalesce(nullif(p.name,''),'ユーザー'),coalesce(p.handle,'u_'||substr(md5(caller),1,16))
 into author_name,author_handle from public.profiles p where p.id::text=caller;
 author_name:=coalesce(author_name,'ユーザー');
 author_handle:=coalesce(author_handle,'u_'||substr(md5(caller),1,16));
 insert into public.posts(id,parent_id,user_id,body,author_name,handle,initial,is_mine,avatar_index)
 values(reply_id,target_post_id,caller,reply_body,author_name,'@'||author_handle,left(author_name,1),true,0)
 on conflict(id) do nothing;
 if not exists(select 1 from public.posts p where p.id=reply_id and p.user_id::text=caller and p.parent_id=target_post_id and p.body=reply_body) then
  raise exception 'Reply ID already used' using errcode='23505';
 end if;
 return query select p.* from public.posts p where p.id=reply_id and p.user_id::text=caller;
end;
$$;

create or replace function public.create_post(post_id uuid,post_body text,expected_user_id text)
returns setof public.posts language plpgsql security definer set search_path=''
as $$
declare caller text:=public.user_id();author_name text;author_handle text;
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then raise exception 'Login required' using errcode='42501'; end if;
 post_body:=btrim(post_body);
 if post_id is null or post_body is null or char_length(post_body) not between 1 and 70 then
  raise exception 'Invalid post' using errcode='22023';
 end if;
 select coalesce(nullif(p.name,''),'ユーザー'),coalesce(p.handle,'u_'||substr(md5(caller),1,16))
 into author_name,author_handle from public.profiles p where p.id::text=caller;
 author_name:=coalesce(author_name,'ユーザー');author_handle:=coalesce(author_handle,'u_'||substr(md5(caller),1,16));
 insert into public.posts(id,user_id,body,author_name,handle,initial,is_mine,avatar_index)
 values(post_id,caller,post_body,author_name,'@'||author_handle,left(author_name,1),true,0)
 on conflict(id) do nothing;
 if not exists(select 1 from public.posts p where p.id=post_id and p.user_id::text=caller and p.parent_id is null and p.body=post_body) then
  raise exception 'Post ID already used' using errcode='23505';
 end if;
 return query select p.* from public.posts p where p.id=post_id;
end;
$$;

revoke all on function public.get_user_relationship(text,text) from public;
revoke all on function public.list_user_relationships(text) from public;
revoke all on function public.set_user_relationship(text,text,boolean,text) from public;
revoke all on function public.get_visible_posts(text) from public;
revoke all on function public.create_post(uuid,text,text) from public;
grant execute on function public.get_user_relationship(text,text) to anon,authenticated;
grant execute on function public.list_user_relationships(text) to anon,authenticated;
grant execute on function public.set_user_relationship(text,text,boolean,text) to anon,authenticated;
grant execute on function public.get_visible_posts(text) to anon,authenticated;
grant execute on function public.create_post(uuid,text,text) to anon,authenticated;
revoke select,insert on public.posts from anon,authenticated;
revoke select on public.profiles from anon,authenticated;
create or replace function public.get_notifications(expected_user_id text, before_created_at timestamptz default null, before_id uuid default null)
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
   (select count(*) from public.post_likes l where l.post_id = n.post_id and l.user_id <> caller and not public.is_blocked_pair(caller,l.user_id)) as people
  from public.notifications n where n.recipient_id = caller and not public.is_blocked_pair(caller,n.actor_id) group by n.post_id
 ), displayed as (
  select n.id, n.post_id, n.created_at, n.read_at, g.people, coalesce(nullif(p.name,''),'ユーザー') as actor_name, false as is_grouped
  from public.notifications n join grouped g on g.post_id = n.post_id
  left join public.profiles p on p.id::text = n.actor_id
  where n.recipient_id = caller and not public.is_blocked_pair(caller,n.actor_id) and g.people <= 20
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

notify pgrst,'reload schema';
commit;
