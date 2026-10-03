-- Public communities with membership-controlled posting and owner moderation.
begin;
create table public.communities (
 id uuid primary key, owner_id text not null, name text not null,
 description text not null default '', created_at timestamptz not null default now(),
 check(char_length(btrim(name,E' \t\n\r')) between 1 and 40), check(char_length(description)<=160)
);
create table public.community_members (
 community_id uuid not null references public.communities(id) on delete cascade,
 user_id text not null, status text not null default 'joined' check(status in ('joined','removed')),
 role text not null default 'member' check(role in ('member','moderator')),
 created_at timestamptz not null default now(), primary key(community_id,user_id)
);
create index communities_created_idx on public.communities(created_at desc,id desc);
create index community_members_user_idx on public.community_members(user_id,community_id);
create table public.community_posts (
 id uuid primary key, community_id uuid not null references public.communities(id) on delete cascade,
 user_id text not null, body text not null check(char_length(btrim(body,E' \t\n\r')) between 1 and 70),
 created_at timestamptz not null default now()
);
create index community_posts_timeline_idx on public.community_posts(community_id,created_at desc,id desc);
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_posts enable row level security;
revoke all on public.communities,public.community_members,public.community_posts from anon,authenticated;

create function public.find_communities(keyword text default '',joined_only boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller text:=public.user_id(); result jsonb;
begin
 if keyword is null or char_length(keyword)>40 or joined_only is null then raise exception 'Invalid query' using errcode='22023'; end if;
 select coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb) into result from (
  select c.id,c.owner_id,c.name,c.description,
   (select count(*) from public.community_members m where m.community_id=c.id and m.status='joined') as member_count,
   exists(select 1 from public.community_members m where m.community_id=c.id and m.user_id=caller and m.status='joined') as is_member
  from public.communities c where not public.is_blocked_pair(caller,c.owner_id)
   and (btrim(keyword)='' or strpos(lower(c.name||' '||c.description),lower(btrim(keyword)))>0)
   and (not joined_only or exists(select 1 from public.community_members m where m.community_id=c.id and m.user_id=caller and m.status='joined'))
  order by c.created_at desc,c.id desc limit 50
 ) c;
 return result;
end;
$$;

create function public.get_community(target_community_id uuid,before_created_at timestamptz default null,before_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller text:=public.user_id(); selected public.communities; members jsonb; posts jsonb; has_more boolean;
 membership text; member_role text; caller_role text;
begin
 if (before_created_at is null)<>(before_id is null) then raise exception 'Invalid cursor' using errcode='22023'; end if;
 select c.* into selected from public.communities c where c.id=target_community_id and not public.is_blocked_pair(caller,c.owner_id);
 if not found then return null; end if;
 select m.status,m.role into membership,member_role from public.community_members m where m.community_id=selected.id and m.user_id=caller;
 caller_role:=case when caller=selected.owner_id then 'owner'
  when membership='joined' and member_role='moderator' then 'moderator'
  when membership='joined' then 'member' else null end;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(p.name,'ユーザー'),
  'handle',p.handle,'status',m.status,'is_owner',m.user_id=selected.owner_id,
  'role',case when m.user_id=selected.owner_id then 'owner' else m.role end) order by m.created_at,m.user_id),'[]'::jsonb) into members
 from public.community_members m join public.profiles p on p.id::text=m.user_id
 where m.community_id=selected.id and public.can_view_account(caller,m.user_id)
  and (m.status='joined' or caller_role in ('owner','moderator'));
 with page as (
  select p.id,p.user_id,p.body,p.created_at,coalesce(a.name,'ユーザー') as author_name,a.handle,
   row_number() over(order by p.created_at desc,p.id desc) as position
  from public.community_posts p left join public.profiles a on a.id::text=p.user_id
  where p.community_id=selected.id and public.can_view_account(caller,p.user_id)
   and (before_created_at is null or (p.created_at,p.id)<(before_created_at,before_id))
  order by p.created_at desc,p.id desc limit 51
 )
 select coalesce(jsonb_agg(to_jsonb(page)-'position' order by page.created_at desc,page.id desc) filter(where position<=50),'[]'::jsonb),
  count(*)>50 into posts,has_more from page;
 return jsonb_build_object('community',jsonb_build_object('id',selected.id,'owner_id',selected.owner_id,
  'name',selected.name,'description',selected.description,'is_member',coalesce(membership='joined',false),
  'member_count',(select count(*) from public.community_members m where m.community_id=selected.id and m.status='joined')),
  'membership',membership,'role',caller_role,'members',members,'posts',posts,'has_more',has_more);
end;
$$;

create function public.manage_community(expected_user_id text,operation text,target_community_id uuid,
 community_name text default '',community_description text default '',target_user_id text default null,
 target_post_id uuid default null,post_body text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare caller text:=public.user_id(); selected public.communities; member_status text; member_role text;
 target_role text; author_id text;
begin
 if caller is null or caller='' or caller is distinct from expected_user_id then raise exception 'Login required' using errcode='42501'; end if;
 if operation is null or operation not in ('create','update','delete','join','leave','promote','demote','remove','restore','post','delete_post') then
  raise exception 'Invalid operation' using errcode='22023';
 end if;
 -- Lock profiles before communities so account deletion cannot leave orphan rows.
 perform 1 from public.profiles p where p.id::text=caller for key share;
 if not found then raise exception 'Profile required' using errcode='42501'; end if;
 if operation='create' then
  insert into public.communities(id,owner_id,name,description) values(target_community_id,caller,btrim(community_name,E' \t\n\r'),community_description) on conflict do nothing;
  if not exists(select 1 from public.communities c where c.id=target_community_id and c.owner_id=caller
    and c.name=btrim(community_name,E' \t\n\r') and c.description=community_description) then
   raise exception 'Community ID already used' using errcode='23505';
  end if;
  insert into public.community_members(community_id,user_id) values(target_community_id,caller) on conflict do nothing;
 else
  select c.* into selected from public.communities c where c.id=target_community_id for update;
  if not found then raise exception 'Community not found' using errcode='P0002'; end if;
  if operation in ('join','post') and public.is_blocked_pair(caller,selected.owner_id) then raise exception 'Blocked account' using errcode='42501'; end if;
  select m.status,m.role into member_status,member_role from public.community_members m where m.community_id=selected.id and m.user_id=caller;
  if operation in ('update','delete','promote','demote') and selected.owner_id<>caller then raise exception 'Owner required' using errcode='42501'; end if;
  if operation in ('remove','restore') and selected.owner_id<>caller
    and (member_status is distinct from 'joined' or member_role is distinct from 'moderator') then
   raise exception 'Moderator required' using errcode='42501';
  end if;
  case operation
   when 'update' then update public.communities set name=btrim(community_name,E' \t\n\r'),description=community_description where id=selected.id;
   when 'delete' then delete from public.communities where id=selected.id; return null;
   when 'join' then
    if member_status='removed' then raise exception 'Membership removed' using errcode='42501'; end if;
    insert into public.community_members(community_id,user_id) values(selected.id,caller) on conflict do nothing;
   when 'leave' then
    if caller=selected.owner_id then raise exception 'Owner cannot leave' using errcode='22023'; end if;
    -- Removal is retained; leaving cannot bypass an owner's membership restriction.
    delete from public.community_members where community_id=selected.id and user_id=caller and status='joined';
   when 'promote','demote' then
    if target_user_id is null or target_user_id=selected.owner_id then raise exception 'Invalid member' using errcode='22023'; end if;
    update public.community_members set role=case when operation='promote' then 'moderator' else 'member' end
     where community_id=selected.id and user_id=target_user_id and status='joined'
      and (operation='promote' or role='moderator');
    if not found then raise exception 'Member not found' using errcode='P0002'; end if;
   when 'remove','restore' then
    if target_user_id is null or target_user_id=selected.owner_id then raise exception 'Invalid member' using errcode='22023'; end if;
    select m.role into target_role from public.community_members m
     where m.community_id=selected.id and m.user_id=target_user_id for update;
    if not found then raise exception 'Member not found' using errcode='P0002'; end if;
    if selected.owner_id<>caller and target_role='moderator' then raise exception 'Owner required for moderator' using errcode='42501'; end if;
    update public.community_members set status=case when operation='remove' then 'removed' else 'joined' end,
     role=case when operation='remove' then 'member' else role end
     where community_id=selected.id and user_id=target_user_id;
   when 'post' then
    if member_status is distinct from 'joined' then raise exception 'Join required' using errcode='42501'; end if;
    post_body:=btrim(post_body,E' \t\n\r');
    if target_post_id is null or post_body is null or char_length(post_body) not between 1 and 70 then raise exception 'Invalid post' using errcode='22023'; end if;
    insert into public.community_posts(id,community_id,user_id,body) values(target_post_id,selected.id,caller,post_body) on conflict do nothing;
    if not exists(select 1 from public.community_posts p where p.id=target_post_id and p.community_id=selected.id and p.user_id=caller and p.body=post_body) then
     raise exception 'Post ID already used' using errcode='23505';
    end if;
   when 'delete_post' then
    select p.user_id into author_id from public.community_posts p where p.id=target_post_id and p.community_id=selected.id;
    if not found then raise exception 'Post not found' using errcode='P0002'; end if;
    if caller<>selected.owner_id and caller<>author_id
      and (member_status is distinct from 'joined' or member_role is distinct from 'moderator') then
     raise exception 'Author or moderator required' using errcode='42501';
    end if;
    delete from public.community_posts where id=target_post_id and community_id=selected.id;
  end case;
 end if;
 return public.get_community(target_community_id);
end;
$$;

create function public.cleanup_profile_communities() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 delete from public.communities where owner_id=old.id::text;
 delete from public.community_members where user_id=old.id::text;
 delete from public.community_posts where user_id=old.id::text;
 return old;
end;
$$;
create trigger cleanup_profile_communities before delete on public.profiles
 for each row execute function public.cleanup_profile_communities();
revoke all on function public.cleanup_profile_communities() from public,anon,authenticated;
revoke all on function public.find_communities(text,boolean) from public;
revoke all on function public.get_community(uuid,timestamptz,uuid) from public;
revoke all on function public.manage_community(text,text,uuid,text,text,text,uuid,text) from public;
grant execute on function public.find_communities(text,boolean) to anon,authenticated;
grant execute on function public.get_community(uuid,timestamptz,uuid) to anon,authenticated;
grant execute on function public.manage_community(text,text,uuid,text,text,text,uuid,text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
