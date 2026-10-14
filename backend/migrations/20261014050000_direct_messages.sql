begin;
create table if not exists public.dm_settings (
 user_id text primary key references public.profiles(id) on delete cascade,
 receive_mode text not null default 'mutual' check(receive_mode in ('all','following','mutual','none'))
);
create table if not exists public.dm_messages (
 id uuid primary key,
 sender_id text not null references public.profiles(id) on delete cascade,
 recipient_id text not null references public.profiles(id) on delete cascade,
 body text not null check(char_length(body) between 1 and 2000),
 created_at timestamptz not null default clock_timestamp(),
 read_at timestamptz,
 check(sender_id<>recipient_id)
);
create index if not exists dm_recipient_time on public.dm_messages(recipient_id,created_at desc);
create index if not exists dm_sender_time on public.dm_messages(sender_id,created_at desc);
alter table public.dm_settings enable row level security;
alter table public.dm_messages enable row level security;
revoke all on public.dm_settings,public.dm_messages from public,anon,authenticated;
create or replace function public.dm_actor(expected_user_id text) returns text language plpgsql stable security definer set search_path='' as $$
declare caller text:=public.acting_user_id();
begin
 if public.user_id() is null or caller is null or caller='' or caller is distinct from expected_user_id then raise exception 'Login required' using errcode='42501'; end if;
 return caller;
end; $$;
revoke all on function public.dm_actor(text) from public,anon,authenticated;
create or replace function public.dm_receive_mode(expected_user_id text,new_mode text default null) returns text language plpgsql security definer set search_path='' as $$
declare caller text:=public.dm_actor(expected_user_id); result text;
begin
 if new_mode is not null then
  if new_mode not in ('all','following','mutual','none') then raise exception 'Invalid mode'; end if;
  insert into public.dm_settings(user_id,receive_mode) values(caller,new_mode) on conflict(user_id) do update set receive_mode=excluded.receive_mode;
 end if;
 select receive_mode into result from public.dm_settings where user_id=caller;
 return coalesce(result,'mutual');
end; $$;
create or replace function public.dm_send(expected_user_id text,target_id text,message_id uuid,message_body text) returns public.dm_messages language plpgsql security definer set search_path='' as $$
declare caller text:=public.dm_actor(expected_user_id); mode text; result public.dm_messages; follows boolean; reverse_follows boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended(caller,0));
 select * into result from public.dm_messages where id=message_id;
 if found then
  if result.sender_id<>caller or result.recipient_id<>target_id or result.body<>btrim(message_body) then raise exception 'Invalid retry'; end if;
  return result;
 end if;
 if target_id=caller or not exists(select 1 from public.profiles where id=target_id) then raise exception 'Invalid recipient'; end if;
 if exists(select 1 from public.user_relationships r where r.kind='block' and ((r.user_id=caller and r.target_id=dm_send.target_id) or (r.user_id=dm_send.target_id and r.target_id=caller))) then raise exception 'Messaging unavailable' using errcode='42501'; end if;
 select receive_mode into mode from public.dm_settings where user_id=target_id;
 mode:=coalesce(mode,'mutual');
 select exists(select 1 from public.user_follows where follower_id=target_id and followee_id=caller) into follows;
 select exists(select 1 from public.user_follows where follower_id=caller and followee_id=target_id) into reverse_follows;
 if mode='none' or (mode='following' and not follows) or (mode='mutual' and not(follows and reverse_follows)) then raise exception 'Messaging unavailable' using errcode='42501'; end if;
 if exists(select 1 from public.dm_messages where sender_id=caller and created_at>clock_timestamp()-interval '1 second') then raise exception 'Please wait before sending'; end if;
 insert into public.dm_messages(id,sender_id,recipient_id,body) values(message_id,caller,target_id,btrim(message_body)) returning * into result;
 return result;
end; $$;
create or replace function public.dm_read(expected_user_id text,target_id text,before_time timestamptz default null) returns setof public.dm_messages language plpgsql stable security definer set search_path='' as $$
declare caller text:=public.dm_actor(expected_user_id);
begin
 return query select m.* from public.dm_messages m where ((m.sender_id=caller and m.recipient_id=target_id) or (m.recipient_id=caller and m.sender_id=target_id)) and (before_time is null or m.created_at<before_time) order by m.created_at desc,m.id desc limit 50;
end; $$;
create or replace function public.dm_mark_read(expected_user_id text,target_id text,through_time timestamptz) returns void language plpgsql security definer set search_path='' as $$
declare caller text:=public.dm_actor(expected_user_id);
begin
 update public.dm_messages set read_at=clock_timestamp() where recipient_id=caller and sender_id=target_id and read_at is null and created_at<=through_time;
end; $$;
create or replace function public.dm_inbox(expected_user_id text) returns table(peer_id text,body text,created_at timestamptz,unread_count bigint) language plpgsql stable security definer set search_path='' as $$
declare caller text:=public.dm_actor(expected_user_id);
begin
 return query with mine as (select m.*,case when m.sender_id=caller then m.recipient_id else m.sender_id end peer from public.dm_messages m where m.sender_id=caller or m.recipient_id=caller), latest as (select distinct on(n.peer) n.* from mine n order by n.peer,n.created_at desc,n.id desc)
 select l.peer,l.body,l.created_at,(select count(*) from mine u where u.peer=l.peer and u.recipient_id=caller and u.read_at is null) from latest l order by l.created_at desc limit 100;
end; $$;
revoke all on function public.dm_receive_mode(text,text),public.dm_send(text,text,uuid,text),public.dm_read(text,text,timestamptz),public.dm_mark_read(text,text,timestamptz),public.dm_inbox(text) from public;
grant execute on function public.dm_receive_mode(text,text),public.dm_send(text,text,uuid,text),public.dm_read(text,text,timestamptz),public.dm_mark_read(text,text,timestamptz),public.dm_inbox(text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
