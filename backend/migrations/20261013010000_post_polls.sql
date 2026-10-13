-- Polls attached to a post: 2-4 options, one vote per account, closes at ends_at.
-- Tables are reachable only through the security definer functions below.

create table if not exists public.post_polls (
  post_id uuid primary key references public.posts(id) on delete cascade,
  options text[] not null check (array_length(options, 1) between 2 and 4),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.post_poll_votes (
  post_id uuid not null references public.post_polls(post_id) on delete cascade,
  user_id text not null,
  option_index int not null check (option_index between 0 and 3),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_polls enable row level security;
alter table public.post_poll_votes enable row level security;

create or replace function public.get_polls(post_ids uuid[], expected_user_id text default null)
returns table(post_id uuid, options text[], counts int[], ends_at timestamptz, my_vote int)
language plpgsql stable security definer set search_path = ''
as $$
declare
  caller text := public.acting_user_id();
begin
  return query
    select p.post_id, p.options,
      array(
        select (select count(*)::int from public.post_poll_votes v where v.post_id = p.post_id and v.option_index = i - 1)
        from generate_series(1, array_length(p.options, 1)) as i
        order by i
      ),
      p.ends_at,
      (select v.option_index from public.post_poll_votes v
        where v.post_id = p.post_id and caller is not null and v.user_id = caller)
    from public.post_polls p
    where p.post_id = any(post_ids);
end;
$$;

create or replace function public.create_poll(target_post_id uuid, poll_options text[], duration_minutes int, expected_user_id text)
returns table(post_id uuid, options text[], counts int[], ends_at timestamptz, my_vote int)
language plpgsql security definer set search_path = ''
as $$
declare
  caller text := public.acting_user_id();
  cleaned text[];
  opt text;
begin
  if caller is null or caller = '' or caller is distinct from expected_user_id then
    raise exception 'Login required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.posts p
    where p.id = target_post_id and p.user_id::text = caller and p.created_at > now() - interval '5 minutes'
  ) then
    raise exception 'Post not found' using errcode = 'P0002';
  end if;
  if duration_minutes is null or duration_minutes not between 5 and 10080 then
    raise exception 'Invalid duration' using errcode = '22023';
  end if;
  cleaned := '{}';
  foreach opt in array coalesce(poll_options, '{}') loop
    opt := btrim(opt);
    if opt <> '' then cleaned := cleaned || opt; end if;
  end loop;
  if array_length(cleaned, 1) is null or array_length(cleaned, 1) not between 2 and 4 then
    raise exception 'Invalid options' using errcode = '22023';
  end if;
  foreach opt in array cleaned loop
    if char_length(opt) > 25 then raise exception 'Option too long' using errcode = '22023'; end if;
  end loop;
  insert into public.post_polls(post_id, options, ends_at)
  values (target_post_id, cleaned, now() + make_interval(mins => duration_minutes))
  on conflict do nothing;
  return query select * from public.get_polls(array[target_post_id], caller);
end;
$$;

create or replace function public.vote_poll(target_post_id uuid, option_index int, expected_user_id text)
returns table(post_id uuid, options text[], counts int[], ends_at timestamptz, my_vote int)
language plpgsql security definer set search_path = ''
as $$
declare
  caller text := public.acting_user_id();
  poll record;
  author_id text;
begin
  if caller is null or caller = '' or caller is distinct from expected_user_id then
    raise exception 'Login required' using errcode = '42501';
  end if;
  select * into poll from public.post_polls pp where pp.post_id = target_post_id;
  if not found then raise exception 'Poll not found' using errcode = 'P0002'; end if;
  if poll.ends_at <= now() then raise exception 'Poll closed' using errcode = '22023'; end if;
  if option_index is null or option_index < 0 or option_index >= array_length(poll.options, 1) then
    raise exception 'Invalid option' using errcode = '22023';
  end if;
  select p.user_id::text into author_id from public.posts p where p.id = target_post_id;
  if author_id is not null and not public.can_view_account(author_id, caller) then
    raise exception 'Blocked account' using errcode = '42501';
  end if;
  insert into public.post_poll_votes(post_id, user_id, option_index)
  values (target_post_id, caller, option_index)
  on conflict do nothing;
  return query select * from public.get_polls(array[target_post_id], caller);
end;
$$;

revoke all on function public.get_polls(uuid[], text) from public;
revoke all on function public.create_poll(uuid, text[], int, text) from public;
revoke all on function public.vote_poll(uuid, int, text) from public;
grant execute on function public.get_polls(uuid[], text) to anon, authenticated;
grant execute on function public.create_poll(uuid, text[], int, text) to anon, authenticated;
grant execute on function public.vote_poll(uuid, int, text) to anon, authenticated;
notify pgrst, 'reload schema';
