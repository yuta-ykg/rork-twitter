begin;
create or replace function public.apply_billing_event(event_key text, target text, payload jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare b public.billing_accounts; p public.billing_payments; event_kind text:=payload->>'kind';
begin
 perform pg_advisory_xact_lock(hashtextextended('billing:'||target,0));
 if exists(select 1 from public.billing_events where event_id=event_key) then return; end if;
 select * into b from public.billing_accounts where user_id=target for update;
 if not found then
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
    stripe_subscription_id=case when b.deletion_pending or event_kind<>'paid' or p.payment_id is distinct from payload->>'payment' then b.stripe_subscription_id else payload->>'subscription' end,
    cancel_at_period_end=case when event_kind='paid' and p.payment_id=payload->>'payment' then coalesce((payload->>'cancel_at_period_end')::boolean,false) else b.cancel_at_period_end end,updated_at=now() where user_id=target;
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
commit;
