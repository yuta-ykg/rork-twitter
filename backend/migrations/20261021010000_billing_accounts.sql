begin;
-- Billing fields are never writable by a browser or mobile client.
create table if not exists public.billing_accounts (
 user_id text primary key references public.profiles(id) on delete cascade,
 stripe_customer_id text unique,
 stripe_subscription_id text unique,
 plan text not null default 'free' check(plan in ('free','plus','premium')),
 term text check(term in ('monthly','yearly','lifetime')),
 status text not null default 'inactive' check(status in ('inactive','active','past_due','canceled','refunded')),
 paid_through timestamptz,
 cancel_at_period_end boolean not null default false,
 introductory_discount_used boolean not null default false,
 updated_at timestamptz not null default now(),
 check(plan='free' or term is not null)
);
alter table public.billing_accounts enable row level security;
revoke all on public.billing_accounts from public,anon,authenticated;
grant all on public.billing_accounts to service_role;
create or replace function public.get_account_plan(expected_user_id text)
returns table(plan text,term text,status text,paid_through timestamptz,cancel_at_period_end boolean,character_limit integer)
language plpgsql stable security definer set search_path='' as $$
declare caller text:=public.acting_user_id(); b public.billing_accounts; effective_plan text:='free';
begin
 if public.user_id() is null or caller is null or caller='' or caller is distinct from expected_user_id then
  raise exception 'Login required' using errcode='42501';
 end if;
 select * into b from public.billing_accounts a where a.user_id=caller;
 if b.plan in ('plus','premium') and b.status in ('active','past_due','canceled') and
  ((b.term='lifetime' and b.status='active') or (b.term in ('monthly','yearly') and b.paid_through>now())) then
  effective_plan:=b.plan;
 end if;
 return query select effective_plan,b.term,coalesce(b.status,'inactive'),b.paid_through,coalesce(b.cancel_at_period_end,false),
  case effective_plan when 'premium' then 280 when 'plus' then 140 else 70 end;
end; $$;
revoke all on function public.get_account_plan(text) from public;
grant execute on function public.get_account_plan(text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
