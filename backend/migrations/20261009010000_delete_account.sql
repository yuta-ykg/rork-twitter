-- Deletes the caller's data: posts (replies to them cascade), likes, reposts, mute/block rows, profile.
-- Avatar files live in storage and are removed by the client before this call.
create or replace function public.delete_account(expected_user_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller text := public.user_id();
begin
  if caller is null or caller = '' or caller is distinct from expected_user_id then
    raise exception 'Login required' using errcode = '42501';
  end if;

  delete from public.post_likes l where l.user_id = caller;
  delete from public.post_reposts r where r.user_id = caller;
  delete from public.user_relationships r where r.user_id = caller or r.target_id = caller;
  delete from public.posts p where p.user_id::text = caller;
  delete from public.profiles p where p.id::text = caller;
end;
$$;

revoke all on function public.delete_account(text) from public;
grant execute on function public.delete_account(text) to anon, authenticated;
notify pgrst, 'reload schema';
