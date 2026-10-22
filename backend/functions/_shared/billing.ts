import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.2.0/index.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-acting-as",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
export class BillingError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
const jwks = createRemoteJWKSet(new URL("https://api.rork.com/.well-known/jwks.json"));
export const admin = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
export async function account(req: Request, expected: unknown): Promise<string> {
  if (typeof expected !== "string" || !expected) throw new BillingError("invalid_account");
  try {
    const token = req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) throw new Error();
    const { payload } = await jwtVerify(token, jwks, { issuer: "https://api.rork.com" });
    if (!payload.sub) throw new Error();
  } catch { throw new BillingError("unauthorized", 401); }
  const headers: Record<string, string> = { Authorization: req.headers.get("Authorization")! };
  const acting = req.headers.get("x-acting-as");
  if (acting) headers["x-acting-as"] = acting;
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers }, auth: { persistSession: false } });
  // Invalid acting headers fall back to the owner in the existing database helper.
  // Require exact agreement with BOTH the requested identity and explicit acting header.
  if (acting && acting !== expected) throw new BillingError("account_mismatch", 403);
  const { data, error } = await client.rpc("get_account_plan", { expected_user_id: expected });
  if (error || !data?.[0]) throw new BillingError("account_mismatch", 403);
  return expected;
}
export function siteURL(): string {
  const url = new URL(Deno.env.get("BILLING_SITE_URL") || "https://invalid.invalid");
  if (url.protocol !== "https:" || url.hostname === "invalid.invalid" || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new BillingError("billing_not_configured", 503);
  return url.origin;
}
export function checkoutEnabled(): boolean {
  return Deno.env.get("BILLING_CHECKOUT_ENABLED") === "true" && !!Deno.env.get("STRIPE_WEBHOOK_SECRET") && !!Deno.env.get("BILLING_SITE_URL");
}
export const catalog = {
  plus: { monthly: 600, yearly: 6600, lifetime: 19800 },
  premium: { monthly: 8000, yearly: 88000, lifetime: 264000 },
} as const;
export type Plan = keyof typeof catalog;
export type Term = keyof typeof catalog.plus;
// Pin the wire format: invoice.subscription/charge and subscription.current_period_end.
export async function stripe(path: string, params?: Record<string, string>, idempotency?: string, method?: "DELETE") {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new BillingError("billing_not_configured", 503);
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: method || (params ? "POST" : "GET"),
    headers: { Authorization: `Bearer ${key}`, "Stripe-Version": "2024-06-20", ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}), ...(idempotency ? { "Idempotency-Key": idempotency } : {}) },
    body: params ? new URLSearchParams(params) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    // Never log credentials, customer data, request bodies or Stripe messages.
    console.error("stripe_request_failed", JSON.stringify({ endpoint: path.split("?")[0].replace(/cus_[A-Za-z0-9]+|sub_[A-Za-z0-9]+|cs_[A-Za-z0-9_]+/g, "[id]"), status: response.status, type: detail?.error?.type, code: detail?.error?.code, param: detail?.error?.param, request_id: response.headers.get("request-id") }));
    throw new BillingError("stripe_unavailable", 502);
  }
  return await response.json();
}
export function failure(error: unknown): Response {
  return error instanceof BillingError ? json({ error: error.code }, error.status) : json({ error: "billing_unavailable" }, 503);
}
export async function verifySignature(body: string, signature: string | null): Promise<void> {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) throw new BillingError("billing_not_configured", 503);
  const parts = (signature || "").split(",").map(x => x.split("="));
  const timestamp = parts.find(([k]) => k === "t")?.[1];
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new BillingError("invalid_signature", 400);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  for (const [kind, value] of parts) {
    if (kind !== "v1" || !/^[a-f0-9]{64}$/.test(value)) continue;
    const bytes = Uint8Array.from(value.match(/../g)!, x => parseInt(x, 16));
    if (await crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(`${timestamp}.${body}`))) return;
  }
  throw new BillingError("invalid_signature", 400);
}
