import { account, admin, BillingError, catalog, checkoutEnabled, cors, failure, json, siteURL, stripe, type Plan, type Term } from "../_shared/billing.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const input = await req.json();
    const id = await account(req, input.expected_user_id);
    if (!checkoutEnabled()) throw new BillingError("checkout_not_ready", 503);
    if (input.accepted_terms !== true) throw new BillingError("terms_required");
    const site = siteURL();
    const plan = input.plan as Plan;
    const term = input.term as Term;
    if (!(plan === "plus" || plan === "premium") || !["monthly", "yearly", "lifetime"].includes(term)) throw new BillingError("invalid_plan");
    const db = admin();
    const { data, error } = await db.rpc("claim_billing_checkout", { target: id, selected_plan: plan, selected_term: term });
    if (error || !data?.[0]) throw new BillingError("existing_contract_or_checkout", 409);
    const checkout = data[0];
    if (checkout.session_url) return json({ url: checkout.session_url });
    // A fixed customer idempotency key prevents concurrent customer duplication.
    const { data: billing, error: readError } = await db.from("billing_accounts").select("stripe_customer_id").eq("user_id", id).single();
    if (readError) throw readError;
    let customer = billing.stripe_customer_id;
    if (!customer) {
      const created = await stripe("customers", { "metadata[account_id]": id }, `yytblue-customer-v1-${id}`);
      customer = created.id;
      const { error: saveError } = await db.from("billing_accounts").update({ stripe_customer_id: customer }).eq("user_id", id);
      if (saveError) throw saveError;
    }
    // An expired local reservation does not prove Stripe has not received payment.
    // Block another purchase while any completed checkout awaits fulfillment.
    const sessions = await stripe(`checkout/sessions?customer=${encodeURIComponent(customer)}&limit=100`);
    if (sessions.has_more) throw new BillingError("billing_review_required", 409);
    for (const previous of sessions.data) {
      if (previous.status !== "complete" || !previous.metadata?.checkout_id) continue;
      const { data: fulfilled, error: fulfillmentError } = await db.from("billing_checkouts").select("completed").eq("id", previous.metadata.checkout_id).eq("user_id", id).maybeSingle();
      if (fulfillmentError || !fulfilled?.completed) throw new BillingError("payment_processing", 409);
    }
    const subscriptions = await stripe(`subscriptions?customer=${encodeURIComponent(customer)}&status=all&limit=100`);
    if (subscriptions.has_more || subscriptions.data.some((sub: { status: string }) => !["canceled", "incomplete_expired"].includes(sub.status))) throw new BillingError("existing_contract", 409);
    const prefix = `yytblue-v1-${plan}-${term}`;
    // Stable server-owned product/price IDs; never accept a client-supplied price.
    let price;
    const existing = await stripe(`prices?lookup_keys[]=${prefix}&active=true&limit=1`);
    if (existing.data.length) price = existing.data[0];
    else {
      const product = await stripe("products", { name: `Yytblue ${plan === "plus" ? "Plus" : "Premium"}`, "metadata[catalog]": "yytblue-v1" }, `product-${prefix}`);
      const params: Record<string, string> = { product: product.id, currency: "jpy", unit_amount: String(catalog[plan][term]), lookup_key: prefix, tax_behavior: "inclusive" };
      if (term !== "lifetime") params["recurring[interval]"] = term === "monthly" ? "month" : "year";
      price = await stripe("prices", params, `price-${prefix}`);
    }
    if (price.unit_amount !== catalog[plan][term] || price.currency !== "jpy" || (term !== "lifetime" && price.recurring?.interval !== (term === "monthly" ? "month" : "year"))) throw new BillingError("catalog_mismatch", 503);
    const params: Record<string, string> = {
      customer, mode: term === "lifetime" ? "payment" : "subscription",
      "line_items[0][price]": price.id, "line_items[0][quantity]": "1",
      "payment_method_types[0]": "card", client_reference_id: id,
      success_url: `${site}/plans?billing=success`, cancel_url: `${site}/plans?billing=canceled`,
      expires_at: String(Math.floor(new Date(checkout.created_at).getTime() / 1000) + 1800),
      "metadata[account_id]": id, "metadata[checkout_id]": checkout.id,
      "metadata[plan]": plan, "metadata[term]": term,
      "custom_text[submit][message]": "Benefits apply only to the selected Yytblue account. Monthly/yearly plans renew at the regular price. Cancel from Plans before renewal.",
    };
    const metadataPrefix = term === "lifetime" ? "payment_intent_data" : "subscription_data";
    for (const [key, value] of Object.entries({ account_id: id, checkout_id: checkout.id, plan, term })) params[`${metadataPrefix}[metadata][${key}]`] = value;
    if (checkout.introductory && term !== "lifetime") {
      const coupon = await stripe("coupons", { duration: "once", percent_off: term === "monthly" ? "50" : "20", name: "Yytblue introductory discount" }, `coupon-yytblue-v1-${term}`);
      params["discounts[0][coupon]"] = coupon.id;
    }
    const session = await stripe("checkout/sessions", params, `checkout-${checkout.id}`);
    const { error: saveError } = await db.from("billing_checkouts").update({ session_id: session.id, session_url: session.url, expires_at: new Date(session.expires_at * 1000).toISOString() }).eq("id", checkout.id);
    if (saveError) throw saveError;
    return json({ url: session.url });
  } catch (error) { return failure(error); }
});
