begin;
do $$ declare f record; d text; begin
 for f in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('create_post','edit_post','get_account_plan') loop
 d:=pg_get_functiondef(f.oid);
 if f.proname='get_account_plan' then d:=replace(d,'when ''premium'' then 280 when ''plus'' then 140 else 70','when ''premium'' then 2000 when ''plus'' then 500 else 280');
 else d:=replace(d,'not between 1 and 70','not between 1 and (select character_limit from public.get_account_plan(expected_user_id))'); end if;
 execute d;
 end loop;
end $$;
alter table public.posts drop constraint if exists posts_body_check;
alter table public.posts add constraint posts_body_check check(char_length(body) between 1 and 2000);
create or replace function public.enforce_post_plan_limit() returns trigger language plpgsql security definer set search_path='' as $$
declare lim integer; begin
 if TG_OP='UPDATE' and new.body is not distinct from old.body then return new; end if;
 select character_limit into lim from public.get_account_plan(new.user_id);
 if lim is null or char_length(new.body) not between 1 and lim then raise exception 'Post exceeds account limit' using errcode='22023'; end if;
 return new;
end $$;
revoke all on function public.enforce_post_plan_limit() from public;
create or replace trigger enforce_post_plan_limit before insert or update of body on public.posts for each row execute function public.enforce_post_plan_limit();
alter policy "Signed-in users insert own posts" on public.posts with check (public.acting_user_id() is not null and user_id=public.acting_user_id() and char_length(body) between 1 and (select character_limit from public.get_account_plan(public.acting_user_id())) and char_length(author_name) between 1 and 40 and char_length(handle) between 1 and 40);
notify pgrst,'reload schema';
commit;
