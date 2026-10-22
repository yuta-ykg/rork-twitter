import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { t, useLanguage } from "@/lib/language";

const rows: [string, string, string, string][] = [
  ["販売事業者・運営責任者", "山崎裕太", "Seller / operator", "Yuta Yamazaki"],
  ["所在地・電話番号", "請求があった場合、遅滞なく開示します。下記メールアドレスへご請求ください。購入前でも請求できます。", "Address / telephone number", "Disclosed without delay upon request. Please contact the email address below. You may request disclosure before purchasing."],
  ["販売価格", "Plus：月額600円（対象者の初月300円）、年額6,600円（対象者の初年度5,280円）、永久19,800円。Premium：月額8,000円（対象者の初月4,000円）、年額88,000円（対象者の初年度70,400円）、永久264,000円（Web限定購入）。上記は税込価格です。購入確認画面とStripe決済画面に最終金額を表示します。", "Prices", "Plus: ¥600/month (eligible first month ¥300), ¥6,600/year (eligible first year ¥5,280), lifetime ¥19,800. Premium: ¥8,000/month (eligible first month ¥4,000), ¥88,000/year (eligible first year ¥70,400), lifetime ¥264,000 (Web purchase only). Prices include tax. The final amount is shown on the review screen and Stripe Checkout."],
  ["商品代金以外の必要料金", "インターネット接続・通信料金はお客様の負担となります。", "Additional costs", "You are responsible for internet access and data charges."],
  ["支払方法・支払時期", "WebのStripe決済でクレジットカードを利用します。初回は購入時、月額・年額の更新分は各更新日に請求します。購入受付中かどうかはプラン画面でご確認ください。", "Payment method / timing", "Pay by card through Stripe on the web. The first payment is charged at purchase and recurring payments on each renewal date. See Plans for purchase availability."],
  ["サービスの提供時期", "販売開始後は、決済確認および契約情報の反映後に、購入したアカウントへ特典を提供します。", "Service delivery", "Once sales begin, benefits will be provided to the purchasing account after payment verification and subscription synchronization."],
  ["契約期間・自動更新", "月額は1か月、年額は1年ごとに自動更新します。初回割引期間後は通常料金が適用されます。永久は自動更新のない買い切りで、本サービスの提供期間中の利用権です。", "Term / renewal", "Monthly plans renew every month and annual plans every year. Regular prices apply after the introductory period. Lifetime is a one-time purchase without renewal, valid for the operating lifetime of this service."],
  ["解約・返品・返金", "Webのプラン画面「支払方法・解約を管理」から更新前に解約できます。通常の解約では支払済み期間の終了まで利用できます。デジタルサービスのため物品の返品はありません。返金のご相談は下記メールへご連絡ください。返金可否は購入状況と適用法令に従って対応し、自動的な返金を保証するものではありません。全額返金時は該当する支払期間の特典を終了し、一部返金では維持します。アカウント削除時は先に更新を停止し、失敗時は削除を中断します。法令に基づく権利を制限するものではありません。", "Cancellation / refunds", "Cancel before renewal using Manage payment method / cancellation on the web Plans page. Access continues until the paid period ends. There are no physical goods to return. Email us for refund requests, which are handled based on the purchase circumstances and applicable law; refunds are not automatically guaranteed. Full refunds end benefits for the affected paid period; partial refunds preserve them. Account deletion first stops renewal and is blocked if cancellation fails. Statutory consumer rights are not restricted."],
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
