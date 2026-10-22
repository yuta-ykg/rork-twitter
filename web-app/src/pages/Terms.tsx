import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { t, useLanguage } from "@/lib/language";

type Clause = [string, string];

const JA: Clause[] = [
  ["有料プラン・決済", "Plus・PremiumはWebのStripe決済で購入します。対象アカウントにのみ適用し、メイン・サブ間では共有しません。同じアカウントではWeb・iOSで特典を利用できます。月額・年額は自動更新し、初回割引は対象アカウントの最初の月額・年額契約に一度限りです。以後は通常価格になります。永久は本サービスの提供期間中の利用権で、自動更新はありません。契約中の重複購入・プラン変更はできません。支払方法、金額、更新・解約・返金条件は特定商取引法に基づく表記と購入確認画面に記載します。通常の解約は期間末に適用し、全額返金では該当期間の特典を終了、一部返金では維持します。契約終了後も既存の長文投稿は残ります。アカウント削除時は先に更新を停止し、確認に失敗した場合は削除せず再試行をお願いする場合があります。法令上必要な決済記録は削除後も必要な期間保持します。"],
  ["運営者情報", "運営者: 山崎裕太\n所在地: 岡山県\n問い合わせ先: yuta1102orenge@icloud.com"],
  [
    "第1条（適用）",
    "本規約は、Yytblue（以下「本サービス」）の利用に関する条件を定めるものです。本サービスを利用する方（以下「ユーザー」）は、本規約に同意したうえで利用するものとします。"
  ],
  [
    "第2条（アカウント）",
    "1. 本サービスの利用にはAppleまたはGoogleによるログインが必要です。\n2. 1つのログインにつき、メインアカウントに加えて最大5つのサブアカウントを作成できます。サブアカウントは他のユーザーからは別のアカウントとして表示されます。\n3. ユーザーは自己の責任でログイン情報を管理するものとし、第三者に利用させてはなりません。\n4. ユーザーは設定画面からいつでもアカウントを削除できます。削除すると、投稿・プロフィール・いいね・ブックマーク・通知などのデータは削除され、元に戻せません。"
  ],
  [
    "第3条（投稿とコンテンツ）",
    "1. 投稿の本文は無料プラン280字、Plus500字、Premium2000字以内、画像は1投稿につき1枚までです。\n2. 投稿したコンテンツの権利はユーザーに帰属します。ただし、ユーザーは本サービスの運営・表示・共有に必要な範囲で、当該コンテンツを無償で利用する権利を運営者に許諾するものとします。\n3. 投稿は他のユーザーに公開され、共有リンクを知る人はログインなしで閲覧できる場合があります。公開したくない情報は投稿しないでください。"
  ],
  [
    "第4条（禁止事項）",
    "ユーザーは、次の行為をしてはなりません。\n・法令または公序良俗に違反する行為\n・他人への誹謗中傷、脅迫、差別、嫌がらせ、なりすまし\n・他人の個人情報、プライバシー、著作権その他の権利の侵害\n・暴力的・性的に露骨な内容、または違法な内容の投稿\n・スパム、不正なアクセス、本サービスの運営を妨げる行為\n・複数のアカウントを用いた、嫌がらせや評価の不正な操作\n・その他、運営者が不適切と判断する行為"
  ],
  [
    "第5条（ミュート・ブロック・通報）",
    "ユーザーは、不快なアカウントをミュートまたはブロックできます。運営者は、本規約に違反する投稿の削除やアカウントの利用停止を、事前の通知なく行うことがあります。"
  ],
  [
    "第6条（プライバシー）",
    "運営者は、ログインに必要なメールアドレスや表示名、ユーザーが入力したプロフィール、投稿、フォロー関係などの情報を、本サービスの提供・改善・不正対策の目的で取り扱います。法令に基づく場合を除き、本人の同意なく第三者に提供しません。"
  ],
  [
    "第7条（サービスの変更・中断・終了）",
    "運営者は、ユーザーへの事前の通知なく、本サービスの内容を変更し、または提供を中断・終了することがあります。"
  ],
  [
    "第8条（免責）",
    "1. 本サービスは現状有姿で提供され、運営者は、その正確性・継続性・特定目的への適合性を保証しません。\n2. ユーザー同士のやり取りや、投稿された内容に関して生じたトラブルは、当事者間で解決するものとします。\n3. 運営者に故意または重過失がある場合を除き、本サービスの利用により生じた損害について、運営者は責任を負いません。"
  ],
  [
    "第9条（規約の変更）",
    "運営者は、必要に応じて本規約を変更できます。変更後の規約は、本ページに掲載した時点から効力を生じ、変更後に本サービスを利用した場合は、変更に同意したものとみなします。"
  ],
  [
    "第10条（準拠法・管轄）",
    "本規約は日本法に準拠します。本サービスに関して紛争が生じた場合は、岡山地方裁判所を第一審の専属的合意管轄とします。"
  ]
];

const EN: Clause[] = [
  ["Paid plans and billing", "Plus and Premium are purchased on the web through Stripe and apply only to the selected account, not to other main/sub-accounts. Benefits for that same account work on web and iOS. Monthly/yearly plans renew automatically. An introductory discount applies once to the account's first monthly/yearly contract; regular prices apply thereafter. Lifetime means the operating lifetime of this service, with no renewal. Duplicate purchases and plan changes are unavailable during a contract. Prices, payment, renewal, cancellation and refund conditions are shown in the commerce notice and purchase review. Normal cancellation takes effect at period end. Full refunds end the affected period's benefits; partial refunds preserve them. Existing long posts remain after expiry. Account deletion first stops renewal and may require a retry if cancellation cannot be confirmed. Legally required billing records are retained for the necessary period after deletion."],
  ["Operator", "Operator: Yuta Yamazaki\nLocation: Okayama, Japan\nContact: yuta1102orenge@icloud.com"],
  [
    "Article 1 (Scope)",
    "These Terms govern your use of Yytblue (the \\\"Service\\\"). By using the Service you agree to these Terms."
  ],
  [
    "Article 2 (Accounts)",
    "1. You must sign in with Apple or Google to use the Service.\n2. Each login may create up to 5 sub-accounts in addition to the main account. Other users see each sub-account as a separate account.\n3. You are responsible for your login credentials and must not let others use them.\n4. You can delete your account at any time from Settings. Posts, profile, likes, bookmarks and notifications are then deleted and cannot be restored."
  ],
  [
    "Article 3 (Content)",
    "1. Posts are limited to 280 characters on Free, 500 on Plus, and 2000 on Premium, with one image each.\n2. You retain rights to your content, and grant the operator a free license to use it as needed to run, display and share it in the Service.\n3. Posts are visible to other users, and anyone with a share link may view a post without signing in. Do not post information you want to keep private."
  ],
  [
    "Article 4 (Prohibited conduct)",
    "You must not:\n- violate laws or public morals\n- defame, threaten, discriminate against, harass or impersonate others\n- infringe others' privacy, copyright or other rights\n- post violent, sexually explicit or illegal content\n- send spam, access the Service without authorization, or disrupt its operation\n- use multiple accounts to harass others or manipulate engagement\n- engage in any other conduct the operator deems inappropriate"
  ],
  [
    "Article 5 (Mute, block and enforcement)",
    "You can mute or block accounts. The operator may remove posts that violate these Terms or suspend accounts without prior notice."
  ],
  [
    "Article 6 (Privacy)",
    "The operator handles your email address, display name, profile, posts and follow relationships to provide, improve and protect the Service. Information is not shared with third parties without your consent, except as required by law."
  ],
  [
    "Article 7 (Changes and termination)",
    "The operator may change, suspend or end the Service without prior notice."
  ],
  [
    "Article 8 (Disclaimer)",
    "1. The Service is provided as is, without warranty of accuracy, continuity or fitness for a particular purpose.\n2. Disputes between users or about posted content are to be resolved between the parties.\n3. Except in cases of intent or gross negligence, the operator is not liable for damages arising from use of the Service."
  ],
  [
    "Article 9 (Changes to these Terms)",
    "The operator may update these Terms. Updates take effect when posted here, and continued use means you accept them."
  ],
  [
    "Article 10 (Governing law)",
    "These Terms are governed by the laws of Japan. The Okayama District Court has exclusive first-instance jurisdiction."
  ]
];

const UPDATED_JA = "最終更新日: 2026年10月22日";
const UPDATED_EN = "Last updated: October 22, 2026";

/** 利用規約。ログインなしでも読める。 */
export default function TermsPage() {
  const { language } = useLanguage();
  const clauses: Clause[] = language === "ja" ? JA : EN;
  return (
    <div className="min-h-dvh bg-muted text-foreground">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-background">
        <header className="sticky top-0 z-10 grid h-12 grid-cols-[44px_1fr_44px] items-center border-b border-border bg-background px-2">
          <Link to="/settings" className="grid h-11 w-11 place-items-center" aria-label={t("戻る")}><ChevronLeft className="h-6 w-6" /></Link>
          <h1 className="text-center text-[17px] font-bold">{t("利用規約")}</h1>
          <span />
        </header>
        <article className="space-y-6 px-5 pb-16 pt-5">
          <p className="text-[13px] text-muted-foreground">{language === "ja" ? UPDATED_JA : UPDATED_EN}</p>
          {clauses.map(([title, body]) => (
            <section key={title} className="space-y-2">
              <h2 className="text-[16px] font-bold">{title}</h2>
              <p className="whitespace-pre-line text-[15px] leading-7 text-foreground/90">{body}</p>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
