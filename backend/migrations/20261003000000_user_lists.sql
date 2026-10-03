-- Private user lists. All mutations validate the Rork JWT identity server-side.
begin;
create table public.user_lists (
 id uuid primary key, owner_id text not null, name text not null,
 description text not null default '', created_at timestamptz not null default now(),
 check (char_length(btrim(name)) between 1 and 40),
 check (char_length(description) <= 160)
);
create index user_lists_owner_idx on public.user_lists(owner_id,created_at);
create table public.user_list_members (
 list_id uuid not null references public.user_lists(id) on delete cascade,
 user_id text not null, primary key(list_id,user_id)
);
alter table public.user_lists enable row level security;
alter table public.user_list_members enable row level security;
revoke all on public.user_lists,public.user_list_members from anon,authenticated;

-- One RPC returns the updated private collection after each atomic operation.
create function public.manage_user_lists(expected_user_id text, operation text default 'read',
 target_list_id uuid default null, list_name text default '', list_description text default '',
 target_user_id text default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare caller text:=public.user_id(); result jsonb;
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then
  raise exception 'Login required' using errcode='42501';
 end if;
 if operation is null or operation not in ('read','create','update','delete','add','remove') then
  raise exception 'Invalid operation' using errcode='22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller,0));
 if operation='create' then
  insert into public.user_lists(id,owner_id,name,description)
   values(target_list_id,caller,btrim(list_name),list_description);
 elsif operation<>'read' then
  perform 1 from public.user_lists l where l.id=target_list_id and l.owner_id=caller for update;
  if not found then raise exception 'List not found' using errcode='42501'; end if;
  if operation='update' then
   update public.user_lists set name=btrim(list_name),description=list_description where id=target_list_id;
  elsif operation='delete' then
   delete from public.user_lists where id=target_list_id;
  elsif operation='add' then
   perform 1 from public.profiles p where p.id::text=target_user_id
     and not public.is_blocked_pair(caller,p.id::text) for key share;
   if not found then
    raise exception 'Profile not found' using errcode='22023';
   end if;
   insert into public.user_list_members(list_id,user_id) values(target_list_id,target_user_id) on conflict do nothing;
  elsif operation='remove' then
   delete from public.user_list_members where list_id=target_list_id and user_id=target_user_id;
  end if;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'name',l.name,'description',l.description,
  'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,
   'name',coalesce(p.name,'ユーザー'),'handle',p.handle) order by m.user_id)
   from public.user_list_members m left join public.profiles p on p.id::text=m.user_id
   where m.list_id=l.id),'[]'::jsonb)) order by l.created_at desc,l.id),'[]'::jsonb)
 into result from public.user_lists l where l.owner_id=caller;
 return result;
end;
$$;

create function public.search_list_profiles(expected_user_id text, keyword text)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare caller text:=public.user_id(); result jsonb;
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then
  raise exception 'Login required' using errcode='42501';
 end if;
 if keyword is null or char_length(btrim(keyword)) not between 1 and 40 then return '[]'::jsonb; end if;
 select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) into result from (
  select p.id::text as id,coalesce(p.name,'ユーザー') as name,p.handle
  from public.profiles p
  where (strpos(lower(coalesce(p.name,'')),lower(btrim(keyword)))>0
    or strpos(lower(coalesce(p.handle,'')),lower(ltrim(btrim(keyword),'@')))>0)
   and not public.is_blocked_pair(caller,p.id::text)
  order by p.handle nulls last,p.id limit 30
 ) p;
 return result;
end;
$$;

-- Clean up owned lists and memberships whenever a profile is deleted.
create function public.cleanup_profile_lists() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 delete from public.user_lists where owner_id=old.id::text;
 delete from public.user_list_members where user_id=old.id::text;
 return old;
end;
$$;
create trigger cleanup_profile_lists before delete on public.profiles
 for each row execute function public.cleanup_profile_lists();
revoke all on function public.cleanup_profile_lists() from public,anon,authenticated;
revoke all on function public.manage_user_lists(text,text,uuid,text,text,text) from public;
revoke all on function public.search_list_profiles(text,text) from public;
grant execute on function public.manage_user_lists(text,text,uuid,text,text,text) to anon,authenticated;
grant execute on function public.search_list_profiles(text,text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
