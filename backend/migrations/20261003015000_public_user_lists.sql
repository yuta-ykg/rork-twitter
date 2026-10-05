-- Public sharing extends the private list tables created by main.
-- Existing lists stay private unless the owner explicitly publishes them.
begin;
alter table public.user_lists
 add column if not exists description text not null default '',
 add column if not exists is_public boolean not null default false;

do $$
begin
 if not exists (
  select 1 from pg_catalog.pg_constraint
  where conname='user_lists_description_length_check'
   and conrelid='public.user_lists'::regclass
 ) then
  alter table public.user_lists add constraint user_lists_description_length_check
   check (char_length(description) <= 160);
 end if;
end;
$$;

create index if not exists user_lists_public_idx
 on public.user_lists(created_at desc,id) where is_public;

-- Compatibility API used by the web and iOS list screens. Main's private
-- list RPCs remain available and both APIs use user_list_members.target_id.
create or replace function public.manage_user_lists(expected_user_id text, operation text default 'read',
 target_list_id uuid default null, list_name text default '', list_description text default '',
 target_user_id text default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare caller text:=public.user_id(); result jsonb;
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then
  raise exception 'Login required' using errcode='42501';
 end if;
 if operation is null or operation not in ('read','create','update','delete','add','remove','publish','unpublish') then
  raise exception 'Invalid operation' using errcode='22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller,0));
 if operation='create' then
  if target_list_id is null then raise exception 'Invalid list ID' using errcode='22023'; end if;
  insert into public.user_lists(id,owner_id,name,description)
   values(target_list_id,caller,btrim(list_name),coalesce(list_description,''));
 elsif operation<>'read' then
  perform 1 from public.user_lists l where l.id=target_list_id and l.owner_id=caller for update;
  if not found then raise exception 'List not found' using errcode='42501'; end if;
  if operation='update' then
   update public.user_lists set name=btrim(list_name),description=coalesce(list_description,''),updated_at=now()
    where id=target_list_id;
  elsif operation in ('publish','unpublish') then
   update public.user_lists set is_public=(operation='publish'),updated_at=now() where id=target_list_id;
  elsif operation='delete' then
   delete from public.user_lists where id=target_list_id;
  elsif operation='add' then
   if target_user_id is null or target_user_id='' then raise exception 'Invalid member' using errcode='22023'; end if;
   perform 1 from public.profiles p where p.id::text=target_user_id
     and not public.is_blocked_pair(caller,p.id::text) for key share;
   if not found then raise exception 'Profile not found' using errcode='22023'; end if;
   insert into public.user_list_members(list_id,target_id) values(target_list_id,target_user_id) on conflict do nothing;
   update public.user_lists set updated_at=now() where id=target_list_id;
  elsif operation='remove' then
   delete from public.user_list_members where list_id=target_list_id and target_id=target_user_id;
   update public.user_lists set updated_at=now() where id=target_list_id;
  end if;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'name',l.name,'description',l.description,
  'owner_id',l.owner_id,'is_public',l.is_public,
  'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.target_id,
   'name',coalesce(p.name,'ユーザー'),'handle',p.handle) order by m.target_id)
   from public.user_list_members m left join public.profiles p on p.id::text=m.target_id
   where m.list_id=l.id),'[]'::jsonb)) order by l.created_at desc,l.id),'[]'::jsonb)
 into result from public.user_lists l where l.owner_id=caller;
 return result;
end;
$$;

create or replace function public.search_list_profiles(expected_user_id text, keyword text)
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

-- Missing, private, and owner-blocked lists all return null.
create or replace function public.get_public_user_list(target_list_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare caller text:=public.user_id(); selected public.user_lists%rowtype; members jsonb; posts jsonb;
begin
 select l.* into selected from public.user_lists l where l.id=target_list_id
  and l.is_public and not public.is_blocked_pair(caller,l.owner_id);
 if not found then return null; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.target_id,'name',coalesce(p.name,'ユーザー'),
  'handle',p.handle) order by m.target_id),'[]'::jsonb) into members
 from public.user_list_members m join public.profiles p on p.id::text=m.target_id
 where m.list_id=selected.id and public.can_view_account(caller,m.target_id);
 select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id desc),'[]'::jsonb) into posts
 from public.get_visible_posts(caller) p
 where p.parent_id is null and exists(select 1 from public.user_list_members m
  where m.list_id=selected.id and m.target_id=p.user_id::text);
 return jsonb_build_object('list',jsonb_build_object('id',selected.id,'name',selected.name,
  'description',selected.description,'is_public',true,'owner_id',selected.owner_id,'members',members),
  'posts',posts);
end;
$$;

create or replace function public.find_public_user_lists(keyword text default '')
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare caller text:=public.user_id(); result jsonb;
begin
 if keyword is null or char_length(keyword)>40 then raise exception 'Invalid query' using errcode='22023'; end if;
 select coalesce(jsonb_agg(to_jsonb(l)),'[]'::jsonb) into result from (
  select l.id,l.name,l.description,l.owner_id,l.is_public,'[]'::jsonb as members
  from public.user_lists l where l.is_public
   and not public.is_blocked_pair(caller,l.owner_id)
   and (btrim(keyword)='' or strpos(lower(l.name),lower(btrim(keyword)))>0)
  order by l.created_at desc,l.id desc limit 50
 ) l;
 return result;
end;
$$;

-- Remove old list memberships when a profile is deleted.
create or replace function public.cleanup_profile_lists() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 delete from public.user_lists where owner_id=old.id::text;
 delete from public.user_list_members where target_id=old.id::text;
 return old;
end;
$$;
drop trigger if exists cleanup_profile_lists on public.profiles;
create trigger cleanup_profile_lists before delete on public.profiles
 for each row execute function public.cleanup_profile_lists();

revoke all on function public.cleanup_profile_lists() from public,anon,authenticated;
revoke all on function public.manage_user_lists(text,text,uuid,text,text,text) from public;
revoke all on function public.search_list_profiles(text,text) from public;
revoke all on function public.get_public_user_list(uuid) from public;
revoke all on function public.find_public_user_lists(text) from public;
grant execute on function public.manage_user_lists(text,text,uuid,text,text,text) to anon,authenticated;
grant execute on function public.search_list_profiles(text,text) to anon,authenticated;
grant execute on function public.get_public_user_list(uuid) to anon,authenticated;
grant execute on function public.find_public_user_lists(text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
