import { account, admin, BillingError, cors, failure, json, stripe } from "../_shared/billing.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const input = await req.json();
    const id = await account(req, input.expected_user_id);
    const db = admin();
    // Serializes with checkout claims and blocks new purchases until deletion.
    const { data, error } = await db.rpc("begin_billing_deletion", { target: id });
    if (error || !data?.[0]) throw new BillingError("deletion_not_ready", 409);
    const billing = data[0];
    const { data: pending, error: pendingError } = await db.from("billing_checkouts").select("id,session_id").eq("user_id", id).eq("completed", false).gt("expires_at", new Date().toISOString());
    if (pendingError) throw pendingError;
    for (const checkout of pending || []) {
      if (!checkout.session_id) throw new BillingError("checkout_in_progress", 409);
      let session = await stripe(`checkout/sessions/${checkout.session_id}`);
      if (session.status === "open") session = await stripe(`checkout/sessions/${checkout.session_id}/expire`, {});
      // Completed but unfulfilled payment: wait for its webhook before deleting.
      if (session.status !== "expired") throw new BillingError("payment_processing", 409);
      const { error: updateError } = await db.from("billing_checkouts").update({ expires_at: new Date().toISOString() }).eq("id", checkout.id);
      if (updateError) throw updateError;
    }
    if (billing.stripe_customer_id) {
      // Include any incomplete/past-due subscription; never rely on the local flag.
      const subs = await stripe(`subscriptions?customer=${encodeURIComponent(billing.stripe_customer_id)}&status=all&limit=100`);
      if (subs.has_more) throw new BillingError("billing_review_required", 409);
      for (const sub of subs.data) {
        if (["canceled", "incomplete_expired"].includes(sub.status)) continue;
        const canceled = await stripe(`subscriptions/${sub.id}`, undefined, undefined, "DELETE");
        if (canceled.status !== "canceled") throw new BillingError("cancellation_unconfirmed", 503);
      }
    }
    const { error: updateError } = await db.from("billing_accounts").update({ stripe_subscription_id: null, cancel_at_period_end: true, deletion_verified: true }).eq("user_id", id);
    if (updateError) throw updateError;
    return json({ ready: true });
  } catch (error) { return failure(error); }
});
