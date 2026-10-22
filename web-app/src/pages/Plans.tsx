import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, Check, ArrowRight, Feather, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/authContext";
import { t, useLanguage } from "@/lib/language";
import { openBilling, type BillingTerm } from "@/lib/billing";

/** 契約表示はサーバーで確認。決済の公開準備完了までは購入を有効化しない。 */
export default function PlansPage() {
  const { user } = useAuth();
  const { hash, search } = useLocation();
  const { language } = useLanguage();
  const text = (ja: string, en: string) => language === "en" ? en : ja;
  const [selection, setSelection] = useState<{ plan: "plus" | "premium"; term: BillingTerm } | null>(null);
  const [term, setTerm] = useState<BillingTerm>("monthly");
  useEffect(() => {
    if (selection) document.getElementById("purchase-review")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selection]);
  const [accepted, setAccepted] = useState(false);
  useEffect(() => { setAccepted(false); }, [selection, user?.id]);
  const [busy, setBusy] = useState(false);
  const [billingError, setBillingError] = useState(false);
  useEffect(() => { setSelection(null); setBillingError(false); }, [user?.id]);
  useEffect(() => {
    if (hash === "#plus") document.getElementById("plus")?.scrollIntoView({ block: "center" });
  }, [hash]);
  const accountId = user?.id;
  const subscription = useQuery({
    queryKey: ["account-plan", accountId],
    enabled: !!accountId,
    staleTime: 0,
    refetchInterval: search.includes("billing=success") ? 5000 : 30000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_account_plan", { expected_user_id: accountId! });
      if (error) throw error;
      if (!data?.[0]) throw new Error("Missing account plan");
      return data[0];
    },
  });
  const options = useQuery({
    queryKey: ["billing-options", accountId], enabled: !!accountId, staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("billing-account", { body: { expected_user_id: accountId } });
      if (error || typeof data?.checkout_enabled !== "boolean") throw new Error("billing_unavailable");
      return data as { introductory_available: boolean; has_customer: boolean; purchase_blocked: boolean; checkout_enabled: boolean };
    },
  });
  const profile = useQuery({
    queryKey: ["billing-profile", accountId], enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("name,handle").eq("id", accountId!).single();
      if (error) throw error;
      return data;
    },
  });
  async function proceed(action: "checkout" | "portal") {
    if (!accountId || busy || (action === "checkout" && (!selection || !accepted))) return;
    setBusy(true); setBillingError(false);
    try { await openBilling(action, accountId, selection?.plan, selection?.term); }
    catch { setBillingError(true); setBusy(false); }
  }
  const canPurchase = options.isSuccess && !options.isError && options.data.checkout_enabled && !options.data.purchase_blocked && profile.isSuccess && !profile.isError && subscription.isSuccess && !subscription.isError && !busy;
  const current = subscription.isSuccess && !subscription.isError ? subscription.data.plan : null;
  const plans = [
    { name: "Plus", limit: 500, monthly: "600", firstMonth: "300", yearly: "6,600", firstYear: "5,280", lifetime: "19,800" },
    { name: "Premium", limit: 2000, monthly: "8,000", firstMonth: "4,000", yearly: "88,000", firstYear: "70,400", lifetime: "264,000" },
  ];
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[480px] bg-background pb-10">
      <header className="grid h-12 grid-cols-[44px_1fr_44px] items-center border-b border-border px-2">
        <Link to="/settings" aria-label={t("設定")} className="grid h-11 w-11 place-items-center"><ChevronLeft className="h-6 w-6" /></Link>
        <h1 className="text-center text-[17px] font-bold">{t("プラン・購入")}</h1><span />
      </header>
      <div className="space-y-6 px-4 pt-6">
        <section className="relative overflow-hidden rounded-3xl bg-[#1D9BF0]/[0.07] px-6 py-8">
          <div className="mb-5 inline-flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-[#1D9BF0]"><Feather className="h-4 w-4" />YYTBLUE PLANS</div>
          <h2 className="text-[32px] font-extrabold leading-[1.25] tracking-tight">{text("その想いに、", "More room for")}<br /><span className="text-[#1D9BF0]">{text("もっと余白を。", "what matters.")}</span></h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{text("削っていた言葉も、伝えたかった続きも。あなたに合う文字数で、投稿をもっと自由に。", "Keep the details. Finish the thought. Find more space to express yourself.")}</p>
          <div className="mt-6 flex items-end gap-3 font-bold"><span className="text-lg text-muted-foreground">280</span><ArrowRight className="mb-1 h-4 w-4 text-[#1D9BF0]" /><span className="text-3xl text-[#1D9BF0]">500</span><span className="pb-1 text-xs text-muted-foreground">{text("Plusの投稿文字数", "characters with Plus")}</span></div>
        </section>
        <section><p className="text-sm text-muted-foreground">{t("購入対象")}</p><p className="font-bold">{profile.data?.name || user?.name || user?.email}</p>{profile.data?.handle && <p className="text-sm text-muted-foreground">@{profile.data.handle}</p>}<p className="mt-2 text-sm text-muted-foreground">{text("このアカウントだけに適用されます。メイン・サブ間では共有されません。", "Applies only to this account, not to your other accounts.")}</p></section>
        {options.isSuccess && !options.isError && !options.data.checkout_enabled && <p className="rounded-xl border border-border bg-muted p-4 text-sm">{t("決済は準備中です。現在は購入できません。")}</p>}
        {search.includes("billing=success") && <p role="status" className="text-sm text-[#1D9BF0]">{text("決済結果を確認中です。支払い確認後に契約表示が更新されます。画面に戻っただけでは有料化されません。", "Checking payment. Your plan updates only after verified payment, not just by returning here.")}</p>}
        {search.includes("billing=canceled") && <p role="status" className="text-sm">{text("購入を中断しました。再開すると同じ決済画面に戻ります。別のプランを選ぶ場合は最大35分お待ちください。", "Checkout canceled. Resume the same checkout, or wait up to 35 minutes to choose another plan.")}</p>}
        {(billingError || options.isError) && <div role="alert" className="text-sm text-red-600"><p>{text("決済情報を取得できませんでした。時間をおいて再試行してください。", "Billing is unavailable. Please try again shortly.")}</p><button className="min-h-11 text-[#1D9BF0]" onClick={() => { void options.refetch(); setBillingError(false); }}>{t("再読み込み")}</button></div>}
        {options.data?.has_customer && <button disabled={busy} onClick={() => void proceed("portal")} className="min-h-11 w-full rounded-full border border-[#1D9BF0] px-4 font-bold text-[#1D9BF0] disabled:opacity-50">{text("支払方法・解約を管理", "Manage payment method / cancellation")}</button>}
        {subscription.data?.paid_through && <p className="text-sm">{subscription.data.cancel_at_period_end ? text("利用終了予定", "Access ends") : text("支払済み期間の終了", "Paid through")}: {new Date(subscription.data.paid_through).toLocaleDateString(language === "en" ? "en-US" : "ja-JP")}</p>}
        {options.data?.purchase_blocked && <p className="text-sm text-muted-foreground">{text("契約中の重複購入・プラン変更はできません。解約や支払方法の変更は契約管理をご利用ください。", "Duplicate purchases and plan changes are unavailable. Use billing management to cancel or update payment details.")}</p>}
        <div aria-live="polite" className="text-sm">
          {subscription.isPending ? <p>{t("読み込み中…")}</p> : subscription.isError ? <div role="alert"><p>{t("契約情報を取得できませんでした。")}</p><button onClick={() => void subscription.refetch()} className="min-h-11 text-[#1D9BF0]">{t("再読み込み")}</button></div> : <p>{t("現在のプラン")}: {current === "free" ? t("無料プラン") : current === "plus" ? "Plus" : "Premium"}</p>}
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1" role="group" aria-label={text("お支払い期間", "Billing period")}>
          {(["monthly", "yearly", "lifetime"] as const).map(value => <button key={value} aria-pressed={term === value} disabled={busy} onClick={() => { setTerm(value); setSelection(null); }} className={`min-h-11 rounded-full px-2 text-sm font-bold transition-all ${term === value ? "bg-background text-[#1D9BF0] shadow-sm" : "text-muted-foreground"}`}>{value === "monthly" ? text("月額", "Monthly") : value === "yearly" ? text("年額", "Yearly") : text("永久", "Lifetime")}</button>)}
        </div>
        <div className="space-y-5">
          {plans.map((plan) => {
            const plus = plan.name === "Plus";
            const introductory = options.isSuccess && !options.isError && options.data.introductory_available && term !== "lifetime";
            const price = term === "lifetime" ? plan.lifetime : term === "monthly" ? introductory ? plan.firstMonth : plan.monthly : introductory ? plan.firstYear : plan.yearly;
            const regular = term === "monthly" ? plan.monthly : plan.yearly;
            return <section key={plan.name} id={plan.name.toLowerCase()} className={`scroll-mt-5 overflow-hidden rounded-3xl border ${plus || current === plan.name.toLowerCase() ? "border-[#1D9BF0]" : "border-border"}`}>
              {plus && <div className="bg-[#1D9BF0] px-5 py-2 text-center text-xs font-bold text-white">{text("日々の投稿を、もう少し自由に", "A little more freedom for every post")}</div>}
              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between"><h2 className="text-2xl font-extrabold">{plan.name}</h2>{current === plan.name.toLowerCase() && <span className="rounded-full bg-[#1D9BF0]/10 px-3 py-1 text-xs font-bold text-[#1D9BF0]">{t("現在のプラン")}</span>}</div>
                <p className="mt-1 text-sm text-muted-foreground">{plus ? text("ひとことの先まで、伝えよう。", "Say more than the headline.") : text("深い考えも、ひとつの投稿に。", "Give your big ideas the full story.")}</p>
                <div className="my-6 flex items-baseline gap-2"><span className="text-[38px] font-extrabold leading-none tracking-tight">¥{price}</span><span className="text-sm text-muted-foreground">{term === "lifetime" ? text("一度払い", "one-time") : term === "monthly" ? introductory ? text("初月", "first month") : text("/ 月", "/ month") : introductory ? text("初年度", "first year") : text("/ 年", "/ year")}</span></div>
                <p className="-mt-3 min-h-6 text-xs text-muted-foreground">{term === "lifetime" ? text("税込・自動更新なし。サービス提供期間中の利用権。", "Tax included. No renewal. Valid while the service operates.") : introductory ? text(`税込・以降は${term === "monthly" ? "毎月" : "毎年"} ¥${regular}で自動更新`, `Tax included. Then ¥${regular}/${term === "monthly" ? "month" : "year"}, auto-renewing.`) : text("税込・自動更新。更新前に解約できます。", "Tax included. Auto-renews. Cancel before renewal.")}</p>
                <ul className="my-5 space-y-3 text-sm">{[
                  text(`1投稿 ${plan.limit.toLocaleString()}字まで`, `Up to ${plan.limit.toLocaleString()} characters per post`),
                  plus ? text("無料の280字から、220字のゆとり", "220 more characters than Free") : text("無料プランの約7.1倍の文字数", "About 7.1× the space of Free"),
                  text("投稿・返信・引用・編集に対応", "For posts, replies, quotes and edits"),
                  text("同じアカウントならWeb・iOSで利用", "Use on web and iOS with the same account"),
                ].map(feature => <li key={feature} className="flex items-start gap-3"><Check className="h-5 w-5 shrink-0 text-[#1D9BF0]" /><span>{feature}</span></li>)}</ul>
                <button disabled={!canPurchase} onClick={() => { setSelection({ plan: plus ? "plus" : "premium", term }); setBillingError(false); }} className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-4 font-bold transition-transform active:scale-[0.98] disabled:opacity-40 ${plus ? "bg-[#1D9BF0] text-white" : "border border-[#1D9BF0] text-[#1D9BF0]"}`}>{current === plan.name.toLowerCase() ? t("現在のプラン") : text(`${plan.name}で、もっと伝える`, `Make room with ${plan.name}`)}<ArrowRight className="h-4 w-4" /></button>
              </div>
            </section>;
          })}
        </div>
        <p className="text-sm text-muted-foreground">{t("初回割引は対象者のみ。月額・年額は割引期間後に通常料金で自動更新します。永久は買い切りです。")}</p>
        <div className="flex items-center justify-between border-y border-border py-4 text-sm"><div><span className="font-bold">{t("無料プラン")}</span><span className="ml-2 text-muted-foreground">280{text("字 / 投稿", " characters / post")}</span></div><span className="text-xs text-muted-foreground">{current === "free" ? t("現在のプラン") : "¥0"}</span></div>
        <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="h-5 w-5 shrink-0 text-[#1D9BF0]" />{text("お支払いはStripeで安全に。プランを選んだだけでは課金されません。次の画面で内容を確認できます。", "Secure payment with Stripe. Choosing a plan does not charge you. Review your purchase next.")}</p>
        {selection && <section id="purchase-review" className="scroll-mt-5 space-y-3 rounded-xl border border-[#1D9BF0] p-4" aria-label={text("購入内容の確認", "Review purchase")} >
          <h2 className="font-bold">{text("購入内容の確認", "Review purchase")}</h2>
          <p>{profile.data?.name || user?.name} @{profile.data?.handle} · {selection.plan === "plus" ? "Plus" : "Premium"}</p>
          {(() => {
            const amounts = selection.plan === "plus" ? { monthly: 600, yearly: 6600, lifetime: 19800 } : { monthly: 8000, yearly: 88000, lifetime: 264000 };
            const regular = amounts[selection.term];
            const first = options.data?.introductory_available && selection.term !== "lifetime" ? regular * (selection.term === "monthly" ? 0.5 : 0.8) : regular;
            return <><p className="font-bold">{text("今回のお支払い（税込）", "Due now (tax included)")}: ¥{first.toLocaleString()}</p><p className="text-sm">{selection.term === "lifetime" ? text("一度払い。自動更新はありません。永久は本サービスの提供期間中の利用権です。", "One-time payment, no renewal. Lifetime means the operating lifetime of this service.") : text(`${selection.term === "monthly" ? "1か月" : "1年"}後から${selection.term === "monthly" ? "毎月" : "毎年"} ¥${regular.toLocaleString()}（税込）で自動更新。更新前に契約管理から解約できます。`, `Renews ${selection.term === "monthly" ? "monthly after one month" : "yearly after one year"} at ¥${regular.toLocaleString()} (tax included). Cancel in billing management before renewal.`)}</p></>;
          })()}
          <p className="text-sm">{text("続けるとStripeの決済画面に移動します。最終金額と規約を確認してお支払いください。", "Continue to Stripe to review the final amount and terms before paying.")}</p>
          <label className="flex min-h-11 items-start gap-3 py-2 text-sm"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} disabled={busy} className="mt-1 h-5 w-5 shrink-0 accent-[#1D9BF0]" /><span>{text("表示された金額・自動更新・解約条件と、利用規約・特商法表記を確認しました。", "I have reviewed the amount, renewal and cancellation conditions, Terms and commerce notice.")} <Link to="/terms" className="text-[#1D9BF0] underline">{t("利用規約")}</Link> · <Link to="/commerce" className="text-[#1D9BF0] underline">{t("特定商取引法に基づく表記")}</Link></span></label>
          {billingError && <p role="alert" className="text-sm text-red-600">{text("決済画面を開けませんでした。時間をおいて、もう一度お試しください。繰り返す場合は接続状況の確認が必要です。", "Could not open checkout. Please try again shortly. If this continues, the billing connection needs review.")}</p>}
          {!accepted && <p className="text-xs text-muted-foreground">{text("上の確認欄にチェックを入れると進めます。", "Check the agreement above to continue.")}</p>}
          <button disabled={!canPurchase || !accepted} onClick={() => void proceed("checkout")} className="min-h-11 w-full rounded-full bg-[#1D9BF0] px-4 font-bold text-white disabled:opacity-40">{busy ? text("処理中…", "Processing…") : text("Stripeの決済画面へ", "Continue to Stripe")}</button>
          <button disabled={busy} onClick={() => setSelection(null)} className="min-h-11 w-full text-sm">{text("戻る", "Back")}</button>
        </section>}
        <p className="text-sm text-muted-foreground">{text("購入はWebのStripe決済のみです。iOSでは購入済みの特典を利用できます。", "Purchase on the web with Stripe. Purchased benefits are also available on iOS.")}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-1"><Link to="/commerce" className="flex min-h-11 items-center text-sm text-[#1D9BF0]">{t("特定商取引法に基づく表記")}</Link><Link to="/terms" className="flex min-h-11 items-center text-sm text-[#1D9BF0]">{t("利用規約")}</Link><Link to="/privacy" className="flex min-h-11 items-center text-sm text-[#1D9BF0]">{t("プライバシーポリシー")}</Link></div>
      </div>
    </main>
  );
}
