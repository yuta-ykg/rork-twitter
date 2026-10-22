import { account, admin, BillingError, cors, failure, json, siteURL, stripe } from "../_shared/billing.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const input = await req.json();
    const id = await account(req, input.expected_user_id);
    const { data, error } = await admin().from("billing_accounts").select("stripe_customer_id").eq("user_id", id).maybeSingle();
    if (error) throw error;
    if (!data?.stripe_customer_id) throw new BillingError("no_billing_account", 409);
    const site = siteURL();
    const config = await stripe("billing_portal/configurations", {
      "business_profile[headline]": "Yytblue", "business_profile[privacy_policy_url]": `${site}/privacy`,
      "business_profile[terms_of_service_url]": `${site}/terms`,
      "features[customer_update][enabled]": "false",
      "features[invoice_history][enabled]": "true", "features[payment_method_update][enabled]": "true",
      "features[subscription_cancel][enabled]": "true", "features[subscription_cancel][mode]": "at_period_end",
      "features[subscription_update][enabled]": "false", default_return_url: `${site}/plans`,
    }, "yytblue-portal-config-v1");
    const session = await stripe("billing_portal/sessions", { customer: data.stripe_customer_id, configuration: config.id, return_url: `${site}/plans` });
    return json({ url: session.url });
  } catch (error) { return failure(error); }
});
