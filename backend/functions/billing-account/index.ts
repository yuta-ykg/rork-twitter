import { account, admin, checkoutEnabled, cors, failure, json, siteURL } from "../_shared/billing.ts";
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const input = await req.json();
    const id = await account(req, input.expected_user_id);
    const { data, error } = await admin().from("billing_accounts").select("introductory_discount_used,stripe_customer_id,stripe_subscription_id,plan,term,status,paid_through,deletion_pending").eq("user_id", id).maybeSingle();
    if (error) throw error;
    let enabled = checkoutEnabled();
    if (enabled) { try { siteURL(); } catch { enabled = false; } }
    const active = data && ["active", "past_due", "canceled"].includes(data.status) && (data.term === "lifetime" || Date.parse(data.paid_through || "") > Date.now());
    return json({
      introductory_available: !data?.introductory_discount_used,
      has_customer: !!data?.stripe_customer_id,
      purchase_blocked: !!(data?.deletion_pending || data?.stripe_subscription_id || active),
      checkout_enabled: enabled,
    });
  } catch (error) { return failure(error); }
});
