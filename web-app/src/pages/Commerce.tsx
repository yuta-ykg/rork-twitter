import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { t, useLanguage } from "@/lib/language";

const rows: [string, string, string, string][] = [
  ["販売事業者・運営責任者", "山崎裕太", "Seller / operator", "Yuta Yamazaki"],
  ["所在地・電話番号", "請求があった場合、遅滞なく開示します。下記メールアドレスへご請求ください。購入前でも請求できます。", "Address / telephone number", "Disclosed without delay upon request. Please contact the email address below. You may request disclosure before purchasing."],
  ["販売価格", "Plus：月額600円（対象者の初月300円）、年額6,600円（対象者の初年度5,280円）、永久19,800円。Premium：月額8,000円（対象者の初月4,000円）、年額88,000円（対象者の初年度70,400円）、永久264,000円（Web限定購入）。販売開始時の税込総額は購入確認画面に表示します。", "Prices", "Plus: ¥600/month (eligible first month ¥300), ¥6,600/year (eligible first year ¥5,280), lifetime ¥19,800. Premium: ¥8,000/month (eligible first month ¥4,000), ¥88,000/year (eligible first year ¥70,400), lifetime ¥264,000 (Web purchase only). The total tax-inclusive price will be shown at checkout when sales begin."],
  ["商品代金以外の必要料金", "インターネット接続・通信料金はお客様の負担となります。", "Additional costs", "You are responsible for internet access and data charges."],
  ["支払方法・支払時期", "現在、決済は準備中です。支払方法と請求時期は販売開始前に本ページおよび購入確認画面に掲載します。", "Payment method / timing", "Payments are not available yet. Payment methods and billing timing will be published here and at checkout before sales begin."],
  ["サービスの提供時期", "販売開始後は、決済確認および契約情報の反映後に、購入したアカウントへ特典を提供します。", "Service delivery", "Once sales begin, benefits will be provided to the purchasing account after payment verification and subscription synchronization."],
  ["契約期間・自動更新", "月額は1か月、年額は1年ごとに自動更新します。初回割引期間後は通常料金が適用されます。永久は自動更新のない買い切りです。", "Term / renewal", "Monthly plans renew every month and annual plans every year. Regular prices apply after the introductory period. Lifetime is a one-time purchase without automatic renewal."],
  ["解約・返品・返金", "解約手順、解約の適用時期、返品・返金条件は販売開始前に掲載します。現在は購入申込みを受け付けていません。法令に基づく権利を制限するものではありません。", "Cancellation / refunds", "Cancellation procedures, effective dates, and refund terms will be published before sales begin. Purchases are not currently accepted. Statutory consumer rights are not restricted."],
  ["動作環境", "対応するWebブラウザまたはiOSアプリとインターネット接続が必要です。購入前に無料機能の動作をご確認ください。", "System requirements", "A compatible web browser or iOS app and an internet connection are required. Please check the free features before purchasing."],
];

/** 公開の特商法表記。未確定の販売条件は販売開始前に更新する。 */
export default function CommercePage() {
  const { language } = useLanguage();
  const en = language === "en";
  return <main className="mx-auto min-h-dvh w-full max-w-[600px] bg-background pb-10">
    <header className="flex min-h-12 items-center gap-2 border-b border-border px-2">
      <Link to="/settings" className="grid h-11 w-11 shrink-0 place-items-center" aria-label={t("設定")}><ChevronLeft className="h-6 w-6" /></Link>
      <h1 className="py-3 text-base font-bold">{t("特定商取引法に基づく表記")}</h1>
    </header>
    <div className="px-4 pt-6">
      <p className="mb-6 text-sm text-muted-foreground">{t("決済は準備中です。現在は購入できません。")}</p>
      <dl className="divide-y divide-border">{rows.map(([title, body, titleEn, bodyEn]) => <div key={title} className="py-4"><dt className="mb-2 font-bold">{en ? titleEn : title}</dt><dd className="text-sm leading-7">{en ? bodyEn : body}</dd></div>)}</dl>
      <section className="border-t border-border py-4"><h2 className="mb-2 font-bold">{en ? "Contact / disclosure requests" : "お問い合わせ・開示請求先"}</h2><a className="inline-flex min-h-11 items-center break-all text-[#1D9BF0] underline" href="mailto:yuta1102orenge@icloud.com?subject=Yytblue%20Disclosure%20Request">yuta1102orenge@icloud.com</a></section>
    </div>
  </main>;
}
