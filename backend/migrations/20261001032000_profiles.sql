-- Apply after the likes migration, using Supabase SQL Editor.
begin;
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists handle text;
create unique index if not exists profiles_handle_unique on public.profiles(lower(handle)) where handle is not null;

create or replace function public.get_public_profiles(profile_ids text[])
returns table(id text, name text, handle text, bio text, avatar_url text, created_at timestamptz, post_count bigint)
language sql stable security definer set search_path = ''
as $$
 select p.id::text, coalesce(p.name, 'ユーザー'), p.handle, p.bio, p.avatar_url, p.created_at,
   (select count(*) from public.posts t where t.user_id::text = p.id::text)
 from public.profiles p where p.id::text = any(profile_ids);
$$;

create or replace function public.ensure_profile(expected_user_id text, profile_email text, profile_name text, profile_avatar text)
returns void language plpgsql security definer set search_path = ''
as $$
declare caller text := public.user_id();
begin
 if caller is null or caller = '' or caller is distinct from expected_user_id then
  raise exception 'Login required' using errcode = '42501';
 end if;
 -- Never overwrite a profile edited by the user on login or on posting.
 insert into public.profiles(id, email, name, avatar_url, handle)
 values (
  (jsonb_populate_record(null::public.profiles, jsonb_build_object('id', caller))).id,
  profile_email, left(coalesce(nullif(trim(profile_name), ''), 'ユーザー'), 40),
  case when profile_avatar ~ '^https://' then profile_avatar else null end,
  'u_' || substr(md5(caller), 1, 16)
 ) on conflict (id) do nothing;
end;
$$;

create or replace function public.save_profile(expected_user_id text, profile_name text, profile_handle text, profile_bio text, profile_avatar text)
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
    or profile_bio is null or char_length(profile_bio) > 160
    or (nullif(profile_avatar,'') is not null and (profile_avatar !~ '^https://' or char_length(profile_avatar) > 2048)) then
  raise exception 'Invalid profile' using errcode = '22023';
 end if;
 update public.profiles p set name = trim(profile_name), handle = profile_handle,
  bio = profile_bio, avatar_url = nullif(profile_avatar,''), updated_at = now()
 where p.id::text = caller;
 if not found then raise exception 'Profile not found' using errcode = 'P0002'; end if;
 return query select * from public.get_public_profiles(array[caller]);
end;
$$;
revoke all on function public.get_public_profiles(text[]) from public;
revoke all on function public.ensure_profile(text,text,text,text) from public;
revoke all on function public.save_profile(text,text,text,text,text) from public;
grant execute on function public.get_public_profiles(text[]) to anon, authenticated;
grant execute on function public.ensure_profile(text,text,text,text) to anon, authenticated;
grant execute on function public.save_profile(text,text,text,text,text) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
