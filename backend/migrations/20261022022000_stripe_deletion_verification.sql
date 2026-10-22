begin;
alter table public.billing_accounts add column if not exists deletion_verified boolean not null default false;
create or replace function public.begin_billing_deletion(target text)
returns setof public.billing_accounts language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('billing:'||target,0));
 insert into public.billing_accounts(user_id,deletion_pending,deletion_verified) values(target,true,false)
 on conflict(user_id) do update set deletion_pending=true,deletion_verified=false;
 return query select * from public.billing_accounts where user_id=target;
end; $$;
create or replace function public.guard_billing_profile_deletion()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('billing:'||old.id,0));
 if exists(select 1 from public.billing_accounts where user_id=old.id and
  (stripe_subscription_id is not null or (stripe_customer_id is not null and not deletion_verified)))
 or exists(select 1 from public.billing_checkouts where user_id=old.id and not completed and expires_at>now()) then
  raise exception 'Stop billing before deleting this account' using errcode='42501';
 end if;
 return old;
end; $$;
commit;
