-- Private account lists. Apply after user_relationships.
begin;
create table if not exists public.user_lists (
 id uuid primary key,
 owner_id text not null,
 name text not null check (char_length(name) between 1 and 40),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists user_lists_owner_idx on public.user_lists(owner_id,created_at desc);
create table if not exists public.user_list_members (
 list_id uuid not null references public.user_lists(id) on delete cascade,
 target_id text not null check (target_id <> ''),
 added_at timestamptz not null default now(),
 primary key(list_id,target_id)
);
alter table public.user_lists enable row level security;
alter table public.user_list_members enable row level security;
revoke all on public.user_lists,public.user_list_members from public,anon,authenticated;
grant select on public.user_lists,public.user_list_members to anon,authenticated;
drop policy if exists user_lists_read_own on public.user_lists;
create policy user_lists_read_own on public.user_lists for select to anon,authenticated using(owner_id=public.user_id());
drop policy if exists user_list_members_read_own on public.user_list_members;
create policy user_list_members_read_own on public.user_list_members for select to anon,authenticated
 using(exists(select 1 from public.user_lists l where l.id=user_list_members.list_id and l.owner_id=public.user_id()));

create or replace function public.get_user_lists(expected_user_id text)
returns table(id uuid,name text,member_count bigint,created_at timestamptz)
language plpgsql stable security definer set search_path=''
as $$
declare caller text:=public.user_id();
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then raise exception 'Login required' using errcode='42501'; end if;
 return query select l.id,l.name,(select count(*) from public.user_list_members m where m.list_id=l.id),l.created_at
 from public.user_lists l where l.owner_id=caller order by l.created_at desc,l.id;
end;
$$;

create or replace function public.create_user_list(target_list_id uuid,list_name text,expected_user_id text)
returns void language plpgsql security definer set search_path=''
as $$
declare caller text:=public.user_id();
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then raise exception 'Login required' using errcode='42501'; end if;
 list_name:=regexp_replace(list_name,'^[[:space:]]+|[[:space:]]+$','','g');
 if target_list_id is null or list_name is null or char_length(list_name) not between 1 and 40 then raise exception 'Invalid list name' using errcode='22023'; end if;
 insert into public.user_lists(id,owner_id,name) values(target_list_id,caller,list_name) on conflict(id) do nothing;
 if not exists(select 1 from public.user_lists l where l.id=target_list_id and l.owner_id=caller and l.name=list_name) then
  raise exception 'List ID already used' using errcode='23505';
 end if;
end;
$$;

create or replace function public.rename_user_list(target_list_id uuid,list_name text,expected_user_id text)
returns void language plpgsql security definer set search_path=''
as $$
declare caller text:=public.user_id();
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then raise exception 'Login required' using errcode='42501'; end if;
 list_name:=regexp_replace(list_name,'^[[:space:]]+|[[:space:]]+$','','g');
 if target_list_id is null or list_name is null or char_length(list_name) not between 1 and 40 then raise exception 'Invalid list name' using errcode='22023'; end if;
 update public.user_lists l set name=list_name,updated_at=now() where l.id=target_list_id and l.owner_id=caller;
 if not found then raise exception 'List not found' using errcode='42501'; end if;
end;
$$;

create or replace function public.delete_user_list(target_list_id uuid,expected_user_id text)
returns void language plpgsql security definer set search_path=''
as $$
declare caller text:=public.user_id(); list_owner text;
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then raise exception 'Login required' using errcode='42501'; end if;
 select l.owner_id into list_owner from public.user_lists l where l.id=target_list_id for update;
 if not found then return; end if;
 if list_owner is distinct from caller then raise exception 'List not found' using errcode='42501'; end if;
 delete from public.user_lists l where l.id=target_list_id and l.owner_id=caller;
end;
$$;

create or replace function public.set_user_list_member(target_list_id uuid,target_user_id text,included boolean,expected_user_id text)
returns void language plpgsql security definer set search_path=''
as $$
declare caller text:=public.user_id(); list_owner text;
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then raise exception 'Login required' using errcode='42501'; end if;
 if target_list_id is null or target_user_id is null or target_user_id='' or included is null then raise exception 'Invalid member' using errcode='22023'; end if;
 select l.owner_id into list_owner from public.user_lists l where l.id=target_list_id for update;
 if not found or list_owner is distinct from caller then raise exception 'List not found' using errcode='42501'; end if;
 if included then
  if public.is_blocked_pair(caller,target_user_id) then raise exception 'Blocked account' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles p where p.id::text=target_user_id) then raise exception 'Account not found' using errcode='P0002'; end if;
  insert into public.user_list_members(list_id,target_id) values(target_list_id,target_user_id) on conflict do nothing;
 else
  delete from public.user_list_members m where m.list_id=target_list_id and m.target_id=target_user_id;
 end if;
 update public.user_lists l set updated_at=now() where l.id=target_list_id;
end;
$$;

create or replace function public.get_user_list_members(target_list_id uuid,expected_user_id text)
returns table(target_id text,target_name text,target_handle text,is_blocked boolean)
language plpgsql stable security definer set search_path=''
as $$
declare caller text:=public.user_id();
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then raise exception 'Login required' using errcode='42501'; end if;
 if not exists(select 1 from public.user_lists l where l.id=target_list_id and l.owner_id=caller) then raise exception 'List not found' using errcode='42501'; end if;
 return query select m.target_id,
  case when public.is_blocked_pair(caller,m.target_id) then null::text else coalesce(nullif(p.name,''),'ユーザー') end,
  case when public.is_blocked_pair(caller,m.target_id) then null::text else p.handle end,
  public.is_blocked_pair(caller,m.target_id)
 from public.user_list_members m left join public.profiles p on p.id::text=m.target_id
 where m.list_id=target_list_id order by m.added_at,m.target_id;
end;
$$;

create or replace function public.get_user_list_posts(target_list_id uuid,expected_user_id text)
returns setof public.posts language plpgsql stable security definer set search_path=''
as $$
declare caller text:=public.user_id();
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then raise exception 'Login required' using errcode='42501'; end if;
 if not exists(select 1 from public.user_lists l where l.id=target_list_id and l.owner_id=caller) then raise exception 'List not found' using errcode='42501'; end if;
 return query select p.* from public.get_visible_posts(caller) p
 where exists(select 1 from public.user_list_members m where m.list_id=target_list_id and m.target_id=p.user_id::text)
 order by p.created_at desc,p.id desc;
end;
$$;

create or replace function public.search_list_accounts(search_query text,expected_user_id text)
returns table(id text,name text,handle text)
language plpgsql stable security definer set search_path=''
as $$
declare caller text:=public.user_id(); needle text:=lower(btrim(search_query));
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then raise exception 'Login required' using errcode='42501'; end if;
 if needle is null or char_length(needle) not between 1 and 100 then return; end if;
 if left(needle,1)='@' then needle:=substr(needle,2); end if;
 if needle='' then return; end if;
 return query select p.id::text,coalesce(p.name,'ユーザー'),p.handle from public.profiles p
 where not public.is_blocked_pair(caller,p.id::text)
 and (strpos(lower(coalesce(p.name,'')),needle)>0 or strpos(lower(coalesce(p.handle,'')),needle)>0)
 order by p.name,p.id limit 30;
end;
$$;
revoke all on function public.get_user_lists(text) from public;
revoke all on function public.create_user_list(uuid,text,text) from public;
revoke all on function public.rename_user_list(uuid,text,text) from public;
revoke all on function public.delete_user_list(uuid,text) from public;
revoke all on function public.set_user_list_member(uuid,text,boolean,text) from public;
revoke all on function public.get_user_list_members(uuid,text) from public;
revoke all on function public.get_user_list_posts(uuid,text) from public;
revoke all on function public.search_list_accounts(text,text) from public;
grant execute on function public.get_user_lists(text) to anon,authenticated;
grant execute on function public.create_user_list(uuid,text,text) to anon,authenticated;
grant execute on function public.rename_user_list(uuid,text,text) to anon,authenticated;
grant execute on function public.delete_user_list(uuid,text) to anon,authenticated;
grant execute on function public.set_user_list_member(uuid,text,boolean,text) to anon,authenticated;
grant execute on function public.get_user_list_members(uuid,text) to anon,authenticated;
grant execute on function public.get_user_list_posts(uuid,text) to anon,authenticated;
grant execute on function public.search_list_accounts(text,text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
