import { checkoutEnabled, siteURL } from "../_shared/billing.ts";
// Read-only readiness endpoint. Never creates a payment or returns Stripe secrets/account data.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-acting-as",
};
let cached: { expires: number; value: Record<string, unknown> } | undefined;
Deno.serve(async (req: Request) => {
  const respond = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
    status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "GET") return respond({ error: "Method not allowed" }, 405);
  if (cached && cached.expires > Date.now()) return respond(cached.value);
  const key = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
  const mode = key?.startsWith("sk_test_") ? "test" : key?.startsWith("sk_live_") ? "live" : "unknown";
  // Checkout is deliberately disabled until webhook/entitlement verification is complete.
  const value: Record<string, unknown> = { provider: "stripe", mode, connected: false, checkout_enabled: false };
  if (key && mode !== "unknown") {
    try {
      const response = await fetch("https://api.stripe.com/v1/balance", {
        headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const balance = await response.json();
        value.connected = typeof balance.livemode === "boolean";
        if (value.connected && checkoutEnabled()) {
          try { siteURL(); value.checkout_enabled = true; } catch { /* Keep disabled for invalid return URLs. */ }
        }
        value.mode = balance.livemode === true ? "live" : balance.livemode === false ? "test" : "unknown";
      }
    } catch {
      // Do not log upstream responses or secret-bearing request details.
    }
  }
  cached = { value, expires: Date.now() + 60000 };
  return respond(value);
});
