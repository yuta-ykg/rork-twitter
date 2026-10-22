begin;
-- Retained financial identifiers deliberately have no cascading profile foreign key.
create table if not exists public.billing_checkouts (
 id uuid primary key default gen_random_uuid(), user_id text not null,
 plan text not null check(plan in ('plus','premium')),
 term text not null check(term in ('monthly','yearly','lifetime')),
 introductory boolean not null, session_id text unique, session_url text,
 expires_at timestamptz not null default (now()+interval '35 minutes'),
 completed boolean not null default false, created_at timestamptz not null default now()
);
create index if not exists billing_checkouts_user on public.billing_checkouts(user_id,created_at desc);
create table if not exists public.billing_events (
 event_id text primary key, processed_at timestamptz not null default now()
);
create table if not exists public.billing_payments (
 payment_id text primary key, user_id text not null, subscription_id text,
 plan text check(plan in ('plus','premium')), term text check(term in ('monthly','yearly','lifetime')),
 paid_through timestamptz, grant_created bigint not null default 0, paid boolean not null default false,
 refunded boolean not null default false, updated_at timestamptz not null default now()
);
alter table public.billing_accounts add column if not exists stripe_state_created bigint not null default 0;
alter table public.billing_accounts add column if not exists deletion_pending boolean not null default false;
alter table public.billing_checkouts enable row level security;
alter table public.billing_events enable row level security;
alter table public.billing_payments enable row level security;
revoke all on public.billing_checkouts,public.billing_events,public.billing_payments from public,anon,authenticated;
grant all on public.billing_checkouts,public.billing_events,public.billing_payments to service_role;

create or replace function public.claim_billing_checkout(target text, selected_plan text, selected_term text)
returns setof public.billing_checkouts language plpgsql security definer set search_path='' as $$
declare b public.billing_accounts; c public.billing_checkouts;
begin
 perform pg_advisory_xact_lock(hashtextextended('billing:'||target,0));
 insert into public.billing_accounts(user_id) values(target) on conflict do nothing;
 select * into b from public.billing_accounts where user_id=target for update;
 if b.deletion_pending or b.stripe_subscription_id is not null or (b.status in ('active','past_due','canceled') and (b.term='lifetime' or b.paid_through>now())) then
  raise exception 'existing_contract';
 end if;
 select * into c from public.billing_checkouts where user_id=target and not completed and expires_at>now() order by created_at desc limit 1;
 if found then
  if c.plan<>selected_plan or c.term<>selected_term then raise exception 'checkout_in_progress'; end if;
  return next c; return;
 end if;
 insert into public.billing_checkouts(user_id,plan,term,introductory)
 values(target,selected_plan,selected_term,not b.introductory_discount_used and selected_term<>'lifetime') returning * into c;
 return next c;
end; $$;
revoke all on function public.claim_billing_checkout(text,text,text) from public,anon,authenticated;
grant execute on function public.claim_billing_checkout(text,text,text) to service_role;

-- Called only after signature verification AND retrieval/validation against Stripe.
-- Payment identity is the invoice ID or the lifetime PaymentIntent ID. Refunds are
-- tombstones, including when a refund notification arrives before payment success.
create or replace function public.apply_billing_event(event_key text, target text, payload jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare b public.billing_accounts; p public.billing_payments; event_kind text:=payload->>'kind';
begin
 perform pg_advisory_xact_lock(hashtextextended('billing:'||target,0));
 if exists(select 1 from public.billing_events where event_id=event_key) then return; end if;
 select * into b from public.billing_accounts where user_id=target for update;
 if not found then
  -- A deleted account must never be recreated by a delayed payment notification.
  insert into public.billing_events(event_id) values(event_key) on conflict do nothing; return;
 end if;
 if b.stripe_customer_id is distinct from payload->>'customer' then raise exception 'customer_mismatch'; end if;
 if event_kind in ('paid','refund') then
  insert into public.billing_payments(payment_id,user_id,subscription_id,plan,term,paid_through,grant_created,paid,refunded)
  values(payload->>'payment',target,payload->>'subscription',payload->>'plan',payload->>'term',
   (payload->>'paid_through')::timestamptz,coalesce((payload->>'grant_created')::bigint,0),event_kind='paid',coalesce((payload->>'refunded')::boolean,false) or event_kind='refund')
  on conflict(payment_id) do update set
   paid=public.billing_payments.paid or excluded.paid,
   grant_created=greatest(public.billing_payments.grant_created,excluded.grant_created),
   refunded=public.billing_payments.refunded or excluded.refunded,
   plan=coalesce(excluded.plan,public.billing_payments.plan), term=coalesce(excluded.term,public.billing_payments.term),
   paid_through=coalesce(excluded.paid_through,public.billing_payments.paid_through), updated_at=now()
  where public.billing_payments.user_id=target;
  if event_kind='paid' then
   update public.billing_checkouts set completed=true where id::text=payload->>'checkout' and user_id=target;
   update public.billing_accounts set introductory_discount_used=introductory_discount_used or coalesce((payload->>'introductory')::boolean,false) where user_id=target;
  end if;
  select * into p from public.billing_payments where user_id=target and paid order by grant_created desc,payment_id desc limit 1;
  if found then
   update public.billing_accounts set plan=p.plan,term=p.term,
    status=case when p.refunded then 'refunded' else 'active' end,
    paid_through=p.paid_through,
    -- Keep the subscription binding until Stripe confirms its terminal state.
    stripe_subscription_id=case when b.deletion_pending then b.stripe_subscription_id else coalesce(b.stripe_subscription_id,p.subscription_id) end,updated_at=now() where user_id=target;
  end if;
 elsif event_kind='subscription' then
  if (payload->>'created')::bigint>=b.stripe_state_created and
   (b.stripe_subscription_id is null or b.stripe_subscription_id=payload->>'subscription') then
   update public.billing_accounts set
    cancel_at_period_end=coalesce((payload->>'cancel_at_period_end')::boolean,false),
    stripe_subscription_id=case when b.deletion_pending or payload->>'status' in ('canceled','incomplete_expired') then null else payload->>'subscription' end,
    stripe_state_created=(payload->>'created')::bigint,updated_at=now() where user_id=target;
  end if;
 else raise exception 'invalid_event_kind';
 end if;
 insert into public.billing_events(event_id) values(event_key) on conflict do nothing;
end; $$;
revoke all on function public.apply_billing_event(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.apply_billing_event(text,text,jsonb) to service_role;
create or replace function public.begin_billing_deletion(target text)
returns setof public.billing_accounts language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('billing:'||target,0));
 insert into public.billing_accounts(user_id,deletion_pending) values(target,true)
 on conflict(user_id) do update set deletion_pending=true;
 return query select * from public.billing_accounts where user_id=target;
end; $$;
revoke all on function public.begin_billing_deletion(text) from public,anon,authenticated;
grant execute on function public.begin_billing_deletion(text) to service_role;

-- Existing Web/iOS RPCs cannot bypass cancellation by deleting profiles directly.
create or replace function public.guard_billing_profile_deletion()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('billing:'||old.id,0));
 if exists(select 1 from public.billing_accounts where user_id=old.id and stripe_subscription_id is not null)
 or exists(select 1 from public.billing_checkouts where user_id=old.id and not completed and expires_at>now()) then
  raise exception 'Stop billing before deleting this account' using errcode='42501';
 end if;
 return old;
end; $$;
do $$ begin
 if not exists(select 1 from pg_trigger where tgname='billing_profile_deletion_guard' and tgrelid='public.profiles'::regclass) then
  create trigger billing_profile_deletion_guard before delete on public.profiles for each row execute function public.guard_billing_profile_deletion();
 end if;
end $$;
notify pgrst,'reload schema';
commit;
