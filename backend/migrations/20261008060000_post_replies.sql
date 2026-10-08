-- posts.reply_to links a reply to the post it answers. Replies are ordinary posts (70 chars, optional image).
-- create_reply_post wraps create_post and then sets reply_to. get_visible_posts returns setof posts, so reply_to
-- is delivered to clients automatically; reply counts are derived client-side.
alter table public.posts add column if not exists reply_to uuid references public.posts(id) on delete cascade;
create index if not exists posts_reply_to_idx on public.posts(reply_to) where reply_to is not null;

create or replace function public.create_reply_post(
  post_id uuid,
  post_body text,
  reply_to_id uuid,
  expected_user_id text,
  post_image_url text default null
)
returns setof public.posts
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
  if reply_to_id is null or reply_to_id = post_id
     or not exists (select 1 from public.posts p where p.id = reply_to_id) then
    raise exception 'Invalid reply target' using errcode = '22023';
  end if;
  perform public.create_post(post_id => post_id, post_body => post_body,
                             expected_user_id => expected_user_id, post_image_url => post_image_url);
  update public.posts p set reply_to = reply_to_id
  where p.id = post_id and p.user_id::text = caller and p.reply_to is null;
  return query select p.* from public.posts p where p.id = post_id;
end;
$$;

revoke all on function public.create_reply_post(uuid, text, uuid, text, text) from public;
grant execute on function public.create_reply_post(uuid, text, uuid, text, text) to anon, authenticated;
notify pgrst, 'reload schema';
