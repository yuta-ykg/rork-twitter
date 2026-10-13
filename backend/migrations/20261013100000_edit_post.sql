-- Editing a post: only the author, only the body, 1-70 chars.
-- Posts are reachable only through the security definer functions.

create or replace function public.edit_post(target_post_id uuid, new_body text, expected_user_id text)
returns setof public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller text := public.acting_user_id();
  new_body_trimmed text := btrim(new_body);
begin
  if caller is null or caller = '' or caller is distinct from expected_user_id then
    raise exception 'Login required' using errcode = '42501';
  end if;
  if new_body_trimmed is null or char_length(new_body_trimmed) not between 1 and 70 then
    raise exception 'Invalid post body' using errcode = '22023';
  end if;
  update public.posts p
  set body = new_body_trimmed
  where p.id = target_post_id and p.user_id::text = caller;
  if not found then
    raise exception 'Post not found or not yours' using errcode = '42501';
  end if;
  return query select p.* from public.posts p where p.id = target_post_id;
end;
$$;

revoke all on function public.edit_post(uuid, text, text) from public;
grant execute on function public.edit_post(uuid, text, text) to anon, authenticated;
notify pgrst, 'reload schema';
