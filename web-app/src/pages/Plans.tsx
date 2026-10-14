import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/hooks/authContext";
import { t } from "@/lib/language";

/** 決済接続前のプラン比較。未検証の契約や購入成功を表示しない。 */
export default function PlansPage() {
  const { user } = useAuth();
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
        <section className="rounded-xl border border-border p-4"><h2 className="font-bold">{t("無料プラン")}</h2><p className="text-sm text-muted-foreground">{t("投稿文字数上限")}: 70</p></section>
        <div className="grid grid-cols-2 gap-3">
          {plans.map((plan) => <section key={plan.name} className="min-w-0 rounded-xl border border-border p-3">
            <h2 className="text-xl font-bold text-[#1D9BF0]">{plan.name}</h2>
            <p className="mt-2 text-sm">{t("投稿文字数上限")}: {plan.limit}</p>
            <dl className="mt-5 space-y-5 text-sm">
              <div><dt className="text-muted-foreground">{t("月額")}</dt><dd className="font-bold">¥{plan.monthly}</dd><dd>{t("初月")}: ¥{plan.firstMonth}</dd></div>
              <div><dt className="text-muted-foreground">{t("年額")}</dt><dd className="font-bold">¥{plan.yearly}</dd><dd>{t("初年度")}: ¥{plan.firstYear}</dd></div>
              <div><dt className="text-muted-foreground">{t("永久")}</dt><dd className="font-bold">¥{plan.lifetime}</dd></div>
            </dl>
          </section>)}
        </div>
        <p className="text-sm text-muted-foreground">{t("初回割引は対象者のみ。月額・年額は割引期間後に通常料金で自動更新します。永久は買い切りです。")}</p>
        <p className="text-sm text-muted-foreground">{t("契約情報の接続前のため、現在のプランは表示していません。")}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-1"><Link to="/commerce" className="flex min-h-11 items-center text-sm text-[#1D9BF0]">{t("特定商取引法に基づく表記")}</Link><Link to="/terms" className="flex min-h-11 items-center text-sm text-[#1D9BF0]">{t("利用規約")}</Link><Link to="/privacy" className="flex min-h-11 items-center text-sm text-[#1D9BF0]">{t("プライバシーポリシー")}</Link></div>
      </div>
    </main>
  );
}
