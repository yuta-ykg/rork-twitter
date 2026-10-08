-- Profile editing: name, @handle and bio. Also refreshes the author's existing posts.
begin;
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists handle text;
create unique index if not exists profiles_handle_unique on public.profiles(lower(handle)) where handle is not null;

create or replace function public.save_profile(expected_user_id text, profile_name text, profile_handle text, profile_bio text, profile_avatar text default '')
returns table(id text, name text, handle text, bio text, avatar_url text, created_at timestamptz, post_count bigint)
language plpgsql security definer set search_path = ''
as $$
declare caller text := public.user_id();
begin
 if caller is null or caller = '' or caller is distinct from expected_user_id then
  raise exception 'Login required' using errcode = '42501';
 end if;
 if profile_name is null or char_length(trim(profile_name)) not between 1 and 40
    or profile_handle is null or profile_handle !~ '^[a-z0-9_]{3,25}$'
    or profile_bio is null or char_length(profile_bio) > 160 then
  raise exception 'Invalid profile' using errcode = '22023';
 end if;
 if exists (select 1 from public.profiles p where lower(p.handle) = lower(profile_handle) and p.id::text <> caller) then
  raise exception 'Handle taken' using errcode = '23505';
 end if;
 update public.profiles p set name = trim(profile_name), handle = profile_handle,
  bio = profile_bio, updated_at = now()
 where p.id::text = caller;
 if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;
 update public.posts t set author_name = trim(profile_name), handle = '@' || profile_handle,
  initial = left(trim(profile_name), 1)
 where t.user_id::text = caller;
 return query select * from public.get_public_profiles(array[caller]);
end;
$$;
revoke all on function public.save_profile(text,text,text,text,text) from public;
grant execute on function public.save_profile(text,text,text,text,text) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
