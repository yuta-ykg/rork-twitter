-- Username availability check for the profile editor. Run in the Supabase SQL Editor.
create or replace function public.handle_available(expected_user_id text, candidate_handle text)
returns boolean
language sql stable security definer set search_path = ''
as $$
 select not exists (
  select 1 from public.profiles p
  where p.handle is not null
    and lower(p.handle) = lower(candidate_handle)
    and p.id::text is distinct from expected_user_id
 );
$$;
revoke all on function public.handle_available(text,text) from public;
grant execute on function public.handle_available(text,text) to anon, authenticated;
notify pgrst, 'reload schema';
