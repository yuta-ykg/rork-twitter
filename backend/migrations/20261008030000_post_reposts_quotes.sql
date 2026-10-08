-- Applied to the live database as `post-reposts-quotes`.
-- posts.quote_of links a quote post to its original. post_reposts holds plain reposts.
-- get_post_reposts / set_post_repost mirror the like RPCs; repost_count includes quote posts.
-- create_quote_post wraps create_post and then sets quote_of.
alter table public.posts add column if not exists quote_of uuid references public.posts(id) on delete set null;
create index if not exists posts_quote_of_idx on public.posts(quote_of);
create table if not exists public.post_reposts (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
