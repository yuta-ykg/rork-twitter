import { admin, BillingError, catalog, cors, failure, json, stripe, verifySignature, type Plan, type Term } from "../_shared/billing.ts";

const idOf = (value: unknown): string | null => typeof value === "string" ? value : value && typeof value === "object" && "id" in value ? String(value.id) : null;
const supported = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded", "invoice.paid", "customer.subscription.updated", "customer.subscription.deleted", "charge.refunded"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 1024 * 1024) throw new BillingError("payload_too_large", 413);
    await verifySignature(raw, req.headers.get("stripe-signature"));
    const event = JSON.parse(raw);
    if (!supported.has(event.type)) return json({ received: true });
    const db = admin();
    const { data: processed, error: processedError } = await db.from("billing_events").select("event_id").eq("event_id", event.id).maybeSingle();
    if (processedError) throw processedError;
    if (processed) return json({ received: true });
    const objectId = event.data?.object?.id;
    if (typeof objectId !== "string") throw new BillingError("invalid_event");
    let source;
    let subscription;
    let payment: string | null = null;
    let paidThrough: string | null = null;
    let refunded = false;
    let kind = "paid";
    if (event.type.startsWith("checkout.session.")) {
      source = await stripe(`checkout/sessions/${encodeURIComponent(objectId)}`);
      if (source.payment_status !== "paid") return json({ received: true });
      if (source.mode === "subscription") {
        // invoice.paid is the sole source of recurring paid-through dates.
        return json({ received: true });
      }
      payment = idOf(source.payment_intent);
      if (!payment) throw new BillingError("missing_payment");
      const intent = await stripe(`payment_intents/${encodeURIComponent(payment)}`);
      const chargeId = idOf(intent.latest_charge);
      if (intent.status !== "succeeded" || !chargeId) throw new BillingError("payment_not_confirmed");
      const charge = await stripe(`charges/${encodeURIComponent(chargeId)}`);
      refunded = charge.amount_refunded >= charge.amount;
    } else if (event.type.startsWith("customer.subscription.")) {
      source = subscription = await stripe(`subscriptions/${encodeURIComponent(objectId)}`);
      kind = "subscription";
    } else if (event.type === "invoice.paid") {
      source = await stripe(`invoices/${encodeURIComponent(objectId)}`);
      if (source.status !== "paid" || source.currency !== "jpy") throw new BillingError("invoice_not_paid");
      const sub = idOf(source.subscription);
      if (!sub) return json({ received: true });
      subscription = await stripe(`subscriptions/${encodeURIComponent(sub)}`);
      const line = source.lines.data.find((item: { type: string; proration?: boolean }) => item.type === "subscription" && !item.proration);
      if (!line?.period?.end || source.lines.has_more) throw new BillingError("unsupported_invoice");
      paidThrough = new Date(line.period.end * 1000).toISOString();
      payment = source.id;
      const chargeId = idOf(source.charge);
      if (chargeId) {
        const charge = await stripe(`charges/${encodeURIComponent(chargeId)}`);
        refunded = charge.amount_refunded >= charge.amount;
      }
    } else {
      source = await stripe(`charges/${encodeURIComponent(objectId)}`);
      if (source.amount_refunded < source.amount) return json({ received: true });
      kind = "refund";
      refunded = true;
      payment = idOf(source.invoice) || idOf(source.payment_intent);
      if (!payment) throw new BillingError("missing_payment");
      if (source.invoice) {
        const invoice = await stripe(`invoices/${encodeURIComponent(idOf(source.invoice)!)}`);
        const subId = idOf(invoice.subscription);
        if (!subId) return json({ received: true });
        subscription = await stripe(`subscriptions/${encodeURIComponent(subId)}`);
      } else {
        source = { ...source, metadata: (await stripe(`payment_intents/${encodeURIComponent(payment)}`)).metadata };
      }
    }
    const metadata = subscription?.metadata || source.metadata;
    const target = metadata?.account_id;
    if (!target || !metadata.checkout_id) return json({ received: true }); // Unrelated Stripe transactions.
    const { data: checkout, error: lookupError } = await db.from("billing_checkouts").select("*").eq("id", metadata.checkout_id).eq("user_id", target).maybeSingle();
    if (lookupError) throw lookupError;
    if (!checkout || checkout.plan !== metadata.plan || checkout.term !== metadata.term) throw new BillingError("checkout_mismatch");
    const customer = idOf(source.customer);
    if (!customer || (subscription && idOf(subscription.customer) !== customer)) throw new BillingError("customer_mismatch");
    const liveKey = Deno.env.get("STRIPE_SECRET_KEY")?.startsWith("sk_live_");
    if (typeof source.livemode !== "boolean" || source.livemode !== liveKey || event.livemode !== liveKey) throw new BillingError("mode_mismatch");
    if (kind === "paid") {
      const plan = checkout.plan as Plan;
      const term = checkout.term as Term;
      const expected = catalog[plan][term];
      const amount = source.amount_paid ?? source.amount_total;
      const discounted = checkout.introductory ? expected * (term === "monthly" ? 0.5 : 0.8) : expected;
      // Renewal invoices may use the regular amount; no arbitrary zero-price grants.
      if (source.currency !== "jpy" || (amount !== expected && amount !== discounted)) throw new BillingError("amount_mismatch");
    }
    const payload = {
      kind, customer, payment, checkout: checkout.id, plan: checkout.plan, term: checkout.term,
      introductory: checkout.introductory, paid_through: paidThrough, refunded,
      grant_created: kind === "paid" ? source.created : 0,
      subscription: subscription && !["canceled", "incomplete_expired"].includes(subscription.status) ? subscription.id : null,
      status: subscription?.status, cancel_at_period_end: subscription?.cancel_at_period_end || subscription?.status === "canceled",
      created: event.created,
    };
    // Subscription notifications need the ID even when terminal, for binding checks.
    if (kind === "subscription") payload.subscription = subscription.id;
    const { error } = await db.rpc("apply_billing_event", { event_key: event.id, target, payload });
    if (error) throw error;
    return json({ received: true });
  } catch (error) { return failure(error); }
});
