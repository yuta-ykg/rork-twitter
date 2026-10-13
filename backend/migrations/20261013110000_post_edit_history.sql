alter table public.posts add column if not exists edited_at timestamptz;
create table if not exists public.post_edit_history (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  body text not null,
  edited_at timestamptz not null default clock_timestamp()
);
create index if not exists post_edit_history_post_idx on public.post_edit_history(post_id, edited_at desc);
alter table public.post_edit_history enable row level security;
revoke all on public.post_edit_history from anon, authenticated;

create or replace function public.record_post_edit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.body is distinct from new.body then
    new.edited_at := clock_timestamp();
    insert into public.post_edit_history(post_id, body, edited_at)
    values(old.id, old.body, new.edited_at);
  end if;
  return new;
end;
$$;
revoke all on function public.record_post_edit() from public;
create or replace trigger record_post_edit before update of body on public.posts
for each row execute function public.record_post_edit();

create or replace function public.get_post_edit_history(target_post_id uuid)
returns setof public.post_edit_history
language sql stable security definer set search_path = '' as $$
  select h.* from public.post_edit_history h
  join public.posts p on p.id = h.post_id
  where p.id = target_post_id
    and public.can_view_account(public.acting_user_id(), p.user_id)
  order by h.edited_at desc, h.id;
$$;
revoke all on function public.get_post_edit_history(uuid) from public;
grant execute on function public.get_post_edit_history(uuid) to anon, authenticated;
notify pgrst, 'reload schema';
