import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/authContext";
import { t } from "@/lib/language";

/** 契約表示はサーバーで確認。決済の公開準備完了までは購入を有効化しない。 */
export default function PlansPage() {
  const { user } = useAuth();
  const accountId = user?.id;
  const subscription = useQuery({
    queryKey: ["account-plan", accountId],
    enabled: !!accountId,
    staleTime: 0,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_account_plan", { expected_user_id: accountId! });
      if (error) throw error;
      if (!data?.[0]) throw new Error("Missing account plan");
      return data[0];
    },
  });
  const current = subscription.isSuccess && !subscription.isError ? subscription.data.plan : null;
  const plans = [
    { name: "Plus", limit: 140, monthly: "600", firstMonth: "300", yearly: "6,600", firstYear: "5,280", lifetime: "19,800" },
    { name: "Premium", limit: 280, monthly: "8,000", firstMonth: "4,000", yearly: "88,000", firstYear: "70,400", lifetime: "264,000" },
  ];
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[480px] bg-background pb-10">
      <header className="grid h-12 grid-cols-[44px_1fr_44px] items-center border-b border-border px-2">
        <Link to="/settings" aria-label={t("設定")} className="grid h-11 w-11 place-items-center"><ChevronLeft className="h-6 w-6" /></Link>
        <h1 className="text-center text-[17px] font-bold">{t("プラン・購入")}</h1><span />
      </header>
      <div className="space-y-6 px-4 pt-6">
        <section><p className="text-sm text-muted-foreground">{t("購入対象")}</p><p className="font-bold">{user?.name || user?.email}</p></section>
        <p className="rounded-xl border border-border bg-muted p-4 text-sm">{t("決済は準備中です。現在は購入できません。")}</p>
        <div aria-live="polite" className="text-sm">
          {subscription.isPending ? <p>{t("読み込み中…")}</p> : subscription.isError ? <div role="alert"><p>{t("契約情報を取得できませんでした。")}</p><button onClick={() => void subscription.refetch()} className="min-h-11 text-[#1D9BF0]">{t("再読み込み")}</button></div> : <p>{t("現在のプラン")}: {current === "free" ? t("無料プラン") : current === "plus" ? "Plus" : "Premium"}</p>}
        </div>
        <section className={`rounded-xl border p-4 ${current === "free" ? "border-[#1D9BF0] ring-1 ring-[#1D9BF0]" : "border-border"}`}><h2 className="font-bold">{t("無料プラン")}</h2>{current === "free" && <p className="text-sm text-[#1D9BF0]">{t("現在のプラン")}</p>}<p className="text-sm text-muted-foreground">{t("投稿文字数上限")}: 70</p></section>
        <div className="grid grid-cols-2 gap-3">
          {plans.map((plan) => <section key={plan.name} className={`min-w-0 rounded-xl border p-3 ${current === plan.name.toLowerCase() ? "border-[#1D9BF0] ring-1 ring-[#1D9BF0]" : "border-border"}`}>
            <h2 className="text-xl font-bold text-[#1D9BF0]">{plan.name}</h2>
            {current === plan.name.toLowerCase() && <p className="text-sm text-[#1D9BF0]">{t("現在のプラン")}</p>}
            <p className="mt-2 text-sm">{t("投稿文字数上限")}: {plan.limit}</p>
            <dl className="mt-5 space-y-5 text-sm">
              <div><dt className="text-muted-foreground">{t("月額")}</dt><dd className="font-bold">¥{plan.monthly}</dd><dd>{t("初月")}: ¥{plan.firstMonth}</dd></div>
              <div><dt className="text-muted-foreground">{t("年額")}</dt><dd className="font-bold">¥{plan.yearly}</dd><dd>{t("初年度")}: ¥{plan.firstYear}</dd></div>
              <div><dt className="text-muted-foreground">{t("永久")}</dt><dd className="font-bold">¥{plan.lifetime}</dd></div>
            </dl>
          </section>)}
        </div>
        <p className="text-sm text-muted-foreground">{t("初回割引は対象者のみ。月額・年額は割引期間後に通常料金で自動更新します。永久は買い切りです。")}</p>
        <p className="text-sm text-muted-foreground">{t("購入はWebのStripe決済のみです。決済の準備完了まで購入できません。")}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-1"><Link to="/commerce" className="flex min-h-11 items-center text-sm text-[#1D9BF0]">{t("特定商取引法に基づく表記")}</Link><Link to="/terms" className="flex min-h-11 items-center text-sm text-[#1D9BF0]">{t("利用規約")}</Link><Link to="/privacy" className="flex min-h-11 items-center text-sm text-[#1D9BF0]">{t("プライバシーポリシー")}</Link></div>
      </div>
    </main>
  );
}
