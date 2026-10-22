import { supabase } from "@/lib/supabase";

export type BillingTerm = "monthly" | "yearly" | "lifetime";
export async function openBilling(action: "checkout" | "portal", userId: string, plan?: "plus" | "premium", term?: BillingTerm): Promise<void> {
  const { data, error } = await supabase.functions.invoke(`billing-${action}`, {
    body: { expected_user_id: userId, plan, term, accepted_terms: action === "checkout" },
  });
  if (error || typeof data?.url !== "string") throw new Error("billing_unavailable");
  const url = new URL(data.url);
  if (url.protocol !== "https:" || !["checkout.stripe.com", "billing.stripe.com"].includes(url.hostname)) throw new Error("invalid_billing_url");
  window.location.assign(url.href);
}

/** Must succeed before either the main or a sub-account's existing deletion RPC. */
export async function prepareBillingDeletion(userId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("billing-prepare-delete", {
    body: { expected_user_id: userId }, headers: { "x-acting-as": userId },
  });
  if (error || data?.ready !== true) throw new Error("billing_deletion_not_ready");
}
