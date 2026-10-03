-- Public sharing is opt-in. Existing lists stay private.
begin;
alter table public.user_lists add column is_public boolean not null default false;
create index user_lists_public_idx on public.user_lists(created_at desc,id) where is_public;

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
  insert into public.user_lists(id,owner_id,name,description)
   values(target_list_id,caller,btrim(list_name),list_description);
 elsif operation<>'read' then
  perform 1 from public.user_lists l where l.id=target_list_id and l.owner_id=caller for update;
  if not found then raise exception 'List not found' using errcode='42501'; end if;
  if operation='update' then
   update public.user_lists set name=btrim(list_name),description=list_description where id=target_list_id;
  elsif operation in ('publish','unpublish') then
   update public.user_lists set is_public=(operation='publish') where id=target_list_id;
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
  'owner_id',l.owner_id,'is_public',l.is_public,
  'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,
   'name',coalesce(p.name,'ユーザー'),'handle',p.handle) order by m.user_id)
   from public.user_list_members m left join public.profiles p on p.id::text=m.user_id
   where m.list_id=l.id),'[]'::jsonb)) order by l.created_at desc,l.id),'[]'::jsonb)
 into result from public.user_lists l where l.owner_id=caller;
 return result;
end;
$$;

-- Missing, private, and owner-blocked lists all return null.
create function public.get_public_user_list(target_list_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare caller text:=public.user_id(); selected public.user_lists; members jsonb; posts jsonb;
begin
 select l.* into selected from public.user_lists l where l.id=target_list_id
  and l.is_public and not public.is_blocked_pair(caller,l.owner_id);
 if not found then return null; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(p.name,'ユーザー'),
  'handle',p.handle) order by m.user_id),'[]'::jsonb) into members
 from public.user_list_members m join public.profiles p on p.id::text=m.user_id
 where m.list_id=selected.id and public.can_view_account(caller,m.user_id);
 select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id desc),'[]'::jsonb) into posts
 from public.get_visible_posts(caller) p
 where p.parent_id is null and exists(select 1 from public.user_list_members m
  where m.list_id=selected.id and m.user_id=p.user_id::text);
 return jsonb_build_object('list',jsonb_build_object('id',selected.id,'name',selected.name,
  'description',selected.description,'is_public',true,'owner_id',selected.owner_id,'members',members),
  'posts',posts);
end;
$$;

create function public.find_public_user_lists(keyword text default '')
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
revoke all on function public.get_public_user_list(uuid) from public;
revoke all on function public.find_public_user_lists(text) from public;
grant execute on function public.get_public_user_list(uuid) to anon,authenticated;
grant execute on function public.find_public_user_lists(text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
