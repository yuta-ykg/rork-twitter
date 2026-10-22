import { supabase } from "@/lib/supabase";

export class BillingRequestError extends Error {
  constructor(public code: string, public status?: number) { super(code); }
}

export function billingErrorMessage(code: string, english: boolean): string {
  const messages: Record<string, [string, string]> = {
    unauthorized: ["ログインの有効期限が切れた可能性があります。再ログインしてお試しください。", "Your session may have expired. Sign in again and retry."],
    account_mismatch: ["購入対象アカウントを確認できません。アカウントを選び直してください。", "Could not verify the account. Select your account again."],
    existing_contract_or_checkout: ["契約中、または別の購入手続きが進行中です。同じプランで再開するか、最大35分後にお試しください。", "An existing plan or checkout is in progress. Resume the same plan or retry after up to 35 minutes."],
    existing_contract: ["すでに契約があります。支払方法・解約の管理をご利用ください。", "A subscription already exists. Use billing management."],
    payment_processing: ["以前のお支払いを確認中です。再購入せず、時間をおいて契約状況を確認してください。", "A previous payment is processing. Wait and check your plan instead of purchasing again."],
    checkout_not_ready: ["現在、購入受付を利用できません。時間をおいてお試しください。", "Checkout is currently unavailable. Please retry later."],
    billing_not_configured: ["決済の設定に問題があります。運営にエラーコードをお知らせください。", "Billing configuration needs review. Contact support with this code."],
    catalog_mismatch: ["料金情報を確認できません。運営にエラーコードをお知らせください。", "Pricing could not be verified. Contact support with this code."],
    invalid_billing_url: ["安全な決済先を確認できなかったため、移動を中止しました。運営にお問い合わせください。", "Navigation stopped because the payment destination could not be verified. Contact support."],
    network_error: ["決済サーバーに接続できません。通信環境を確認して再試行してください。", "Could not connect to billing. Check your connection and retry."],
    navigation_failed: ["決済画面への移動がブラウザに拒否されました。通常のブラウザで開き直してお試しください。", "Your browser blocked navigation. Open the app in a regular browser and retry."],
    terms_required: ["金額・更新条件と利用規約を確認し、同意欄にチェックしてください。", "Review the price and terms, then check the agreement."],
  };
  const fallback: [string, string] = code.startsWith("stripe_")
    ? ["Stripeで決済画面を準備できませんでした。再試行し、繰り返す場合は運営にこのコードをお知らせください。", "Stripe could not prepare checkout. Retry, or contact support with this code if it continues."]
    : ["決済処理を完了できませんでした。時間をおいて再試行し、繰り返す場合は運営にこのコードをお知らせください。", "Billing could not be completed. Retry later, or contact support with this code if it continues."];
  return (messages[code] || fallback)[english ? 1 : 0];
}

export type BillingTerm = "monthly" | "yearly" | "lifetime";
export async function openBilling(action: "checkout" | "portal", userId: string, plan?: "plus" | "premium", term?: BillingTerm): Promise<void> {
  const { data, error } = await supabase.functions.invoke(`billing-${action}`, {
    body: { expected_user_id: userId, plan, term, accepted_terms: action === "checkout" },
  });
  if (error) {
    const response = error.context instanceof Response ? error.context : null;
    const body = response ? await response.clone().json().catch(() => null) : null;
    const code = typeof body?.error === "string" && /^[a-z0-9_]{1,100}$/.test(body.error) ? body.error : response ? "billing_unavailable" : "network_error";
    throw new BillingRequestError(code, response?.status);
  }
  if (typeof data?.url !== "string") throw new BillingRequestError("invalid_billing_url");
  let url: URL;
  try { url = new URL(data.url); } catch { throw new BillingRequestError("invalid_billing_url"); }
  if (url.protocol !== "https:" || !["checkout.stripe.com", "billing.stripe.com"].includes(url.hostname)) throw new BillingRequestError("invalid_billing_url");
  try { window.location.assign(url.href); } catch { throw new BillingRequestError("navigation_failed"); }
}

/** Must succeed before either the main or a sub-account's existing deletion RPC. */
export async function prepareBillingDeletion(userId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("billing-prepare-delete", {
    body: { expected_user_id: userId }, headers: { "x-acting-as": userId },
  });
  if (error || data?.ready !== true) throw new Error("billing_deletion_not_ready");
}
