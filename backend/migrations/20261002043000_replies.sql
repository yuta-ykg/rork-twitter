begin;
alter table public.posts add column if not exists parent_id uuid references public.posts(id) on delete cascade;
create index if not exists posts_parent_created_idx on public.posts(parent_id,created_at,id) where parent_id is not null;

create or replace function public.validate_post_reply()
returns trigger language plpgsql set search_path = ''
as $$
begin
 if tg_op = 'UPDATE' and new.parent_id is distinct from old.parent_id then
  raise exception 'Reply parent cannot be changed' using errcode='22023';
 end if;
 if new.parent_id is not null then
  new.body:=regexp_replace(new.body,'^[[:space:]]+|[[:space:]]+  if new.parent_id = new.id or new.body is null or char_length(new.body) not between 1 and 70 then
   raise exception 'Invalid reply' using errcode='22023';
  end if;
  if tg_op = 'INSERT' and (public.user_id() is null or public.user_id() = '' or new.user_id::text is distinct from public.user_id()) then
   raise exception 'Login required' using errcode='42501';
  end if;
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
   raise exception 'Reply author cannot be changed' using errcode='22023';
  end if;
 end if;
 return new;
end;
$$;
drop trigger if exists validate_post_reply on public.posts;
create trigger validate_post_reply before insert or update on public.posts for each row execute function public.validate_post_reply();

create or replace function public.create_reply(reply_id uuid,target_post_id uuid,reply_body text,expected_user_id text)
returns setof public.posts language plpgsql security definer set search_path = ''
as $$
declare caller text := public.user_id(); author_name text; author_handle text;
begin
 if caller is null or caller = '' or caller is distinct from expected_user_id then
  raise exception 'Login required' using errcode='42501';
 end if;
 reply_body:=regexp_replace(reply_body,'^[[:space:]]+|[[:space:]]+ or reply_id = target_post_id or char_length(trim(reply_body)) not between 1 and 70 or reply_body is null then
  raise exception 'Invalid reply' using errcode='22023';
 end if;
 perform 1 from public.posts p where p.id = target_post_id for key share;
 if not found then raise exception 'Post not found' using errcode='P0002'; end if;
 select coalesce(nullif(p.name,''),'ユーザー'), coalesce(p.handle,'u_'||substr(md5(caller),1,16))
 into author_name,author_handle from public.profiles p where p.id::text=caller;
 author_name:=coalesce(author_name,'ユーザー');
 author_handle:=coalesce(author_handle,'u_'||substr(md5(caller),1,16));
 insert into public.posts(id,parent_id,user_id,body,author_name,handle,initial,is_mine,avatar_index)
 values(reply_id,target_post_id,caller,trim(reply_body),author_name,'@'||author_handle,left(author_name,1),true,0)
 on conflict(id) do nothing;
 if not exists(select 1 from public.posts p where p.id=reply_id and p.user_id::text=caller and p.parent_id=target_post_id and p.body=trim(reply_body)) then
  raise exception 'Reply ID already used' using errcode='23505';
 end if;
 return query select p.* from public.posts p where p.id=reply_id and p.user_id::text=caller;
end;
$$;
revoke all on function public.create_reply(uuid,uuid,text,text) from public;
grant execute on function public.create_reply(uuid,uuid,text,text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
,'','g');
  if new.parent_id = new.id or char_length(trim(new.body)) not between 1 and 70 then
   raise exception 'Invalid reply' using errcode='22023';
  end if;
  if tg_op = 'INSERT' and (public.user_id() is null or public.user_id() = '' or new.user_id::text is distinct from public.user_id()) then
   raise exception 'Login required' using errcode='42501';
  end if;
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
   raise exception 'Reply author cannot be changed' using errcode='22023';
  end if;
 end if;
 return new;
end;
$$;
drop trigger if exists validate_post_reply on public.posts;
create trigger validate_post_reply before insert or update on public.posts for each row execute function public.validate_post_reply();

create or replace function public.create_reply(reply_id uuid,target_post_id uuid,reply_body text,expected_user_id text)
returns setof public.posts language plpgsql security definer set search_path = ''
as $$
declare caller text := public.user_id(); author_name text; author_handle text;
begin
 if caller is null or caller = '' or caller is distinct from expected_user_id then
  raise exception 'Login required' using errcode='42501';
 end if;
 if reply_id is null or target_post_id is null or reply_id = target_post_id or char_length(trim(reply_body)) not between 1 and 70 or reply_body is null then
  raise exception 'Invalid reply' using errcode='22023';
 end if;
 perform 1 from public.posts p where p.id = target_post_id for key share;
 if not found then raise exception 'Post not found' using errcode='P0002'; end if;
 select coalesce(nullif(p.name,''),'ユーザー'), coalesce(p.handle,'u_'||substr(md5(caller),1,16))
 into author_name,author_handle from public.profiles p where p.id::text=caller;
 author_name:=coalesce(author_name,'ユーザー');
 author_handle:=coalesce(author_handle,'u_'||substr(md5(caller),1,16));
 insert into public.posts(id,parent_id,user_id,body,author_name,handle,initial,is_mine,avatar_index)
 values(reply_id,target_post_id,caller,trim(reply_body),author_name,'@'||author_handle,left(author_name,1),true,0)
 on conflict(id) do nothing;
 if not exists(select 1 from public.posts p where p.id=reply_id and p.user_id::text=caller and p.parent_id=target_post_id and p.body=trim(reply_body)) then
  raise exception 'Reply ID already used' using errcode='23505';
 end if;
 return query select p.* from public.posts p where p.id=reply_id and p.user_id::text=caller;
end;
$$;
revoke all on function public.create_reply(uuid,uuid,text,text) from public;
grant execute on function public.create_reply(uuid,uuid,text,text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
,'','g');
 if reply_id is null or target_post_id is null or reply_id = target_post_id or char_length(trim(reply_body)) not between 1 and 70 or reply_body is null then
  raise exception 'Invalid reply' using errcode='22023';
 end if;
 perform 1 from public.posts p where p.id = target_post_id for key share;
 if not found then raise exception 'Post not found' using errcode='P0002'; end if;
 select coalesce(nullif(p.name,''),'ユーザー'), coalesce(p.handle,'u_'||substr(md5(caller),1,16))
 into author_name,author_handle from public.profiles p where p.id::text=caller;
 author_name:=coalesce(author_name,'ユーザー');
 author_handle:=coalesce(author_handle,'u_'||substr(md5(caller),1,16));
 insert into public.posts(id,parent_id,user_id,body,author_name,handle,initial,is_mine,avatar_index)
 values(reply_id,target_post_id,caller,trim(reply_body),author_name,'@'||author_handle,left(author_name,1),true,0)
 on conflict(id) do nothing;
 if not exists(select 1 from public.posts p where p.id=reply_id and p.user_id::text=caller and p.parent_id=target_post_id and p.body=trim(reply_body)) then
  raise exception 'Reply ID already used' using errcode='23505';
 end if;
 return query select p.* from public.posts p where p.id=reply_id and p.user_id::text=caller;
end;
$$;
revoke all on function public.create_reply(uuid,uuid,text,text) from public;
grant execute on function public.create_reply(uuid,uuid,text,text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
,'','g');
  if new.parent_id = new.id or char_length(trim(new.body)) not between 1 and 70 then
   raise exception 'Invalid reply' using errcode='22023';
  end if;
  if tg_op = 'INSERT' and (public.user_id() is null or public.user_id() = '' or new.user_id::text is distinct from public.user_id()) then
   raise exception 'Login required' using errcode='42501';
  end if;
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
   raise exception 'Reply author cannot be changed' using errcode='22023';
  end if;
 end if;
 return new;
end;
$$;
drop trigger if exists validate_post_reply on public.posts;
create trigger validate_post_reply before insert or update on public.posts for each row execute function public.validate_post_reply();

create or replace function public.create_reply(reply_id uuid,target_post_id uuid,reply_body text,expected_user_id text)
returns setof public.posts language plpgsql security definer set search_path = ''
as $$
declare caller text := public.user_id(); author_name text; author_handle text;
begin
 if caller is null or caller = '' or caller is distinct from expected_user_id then
  raise exception 'Login required' using errcode='42501';
 end if;
 if reply_id is null or target_post_id is null or reply_id = target_post_id or char_length(trim(reply_body)) not between 1 and 70 or reply_body is null then
  raise exception 'Invalid reply' using errcode='22023';
 end if;
 perform 1 from public.posts p where p.id = target_post_id for key share;
 if not found then raise exception 'Post not found' using errcode='P0002'; end if;
 select coalesce(nullif(p.name,''),'ユーザー'), coalesce(p.handle,'u_'||substr(md5(caller),1,16))
 into author_name,author_handle from public.profiles p where p.id::text=caller;
 author_name:=coalesce(author_name,'ユーザー');
 author_handle:=coalesce(author_handle,'u_'||substr(md5(caller),1,16));
 insert into public.posts(id,parent_id,user_id,body,author_name,handle,initial,is_mine,avatar_index)
 values(reply_id,target_post_id,caller,trim(reply_body),author_name,'@'||author_handle,left(author_name,1),true,0)
 on conflict(id) do nothing;
 if not exists(select 1 from public.posts p where p.id=reply_id and p.user_id::text=caller and p.parent_id=target_post_id and p.body=trim(reply_body)) then
  raise exception 'Reply ID already used' using errcode='23505';
 end if;
 return query select p.* from public.posts p where p.id=reply_id and p.user_id::text=caller;
end;
$$;
revoke all on function public.create_reply(uuid,uuid,text,text) from public;
grant execute on function public.create_reply(uuid,uuid,text,text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
