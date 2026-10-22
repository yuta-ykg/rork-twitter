import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { t, useLanguage } from "@/lib/language";

type Clause = [string, string];

const JA: Clause[] = [
  ["決済情報の取り扱い", "決済処理はStripeに委託します。Stripeはカード情報や請求に必要な情報を取り扱います。本サービスではカード番号全体やセキュリティコードを保存しません。アカウントとStripeの顧客・契約・決済の識別子、購入プラン、支払済み期間、返金・解約状態、通知の処理記録を、契約提供、本人確認、不正防止、会計・法令対応のため保持します。決済情報は他の利用者には公開しません。アカウント削除後も、会計・法令上必要な決済記録は必要な期間保持し、不要になった情報は適切に削除します。"],
  [
    "運営者情報",
    "運営者: 山崎裕太\n所在地: 岡山県\n問い合わせ先: yuta1102orenge@icloud.com"
  ],
  [
    "1. はじめに",
    "Yytblue（以下「本サービス」）は、ユーザーの個人情報を大切に扱います。本ポリシーは、本サービスが取得する情報とその利用目的、管理方法を説明するものです。本サービスを利用することで、本ポリシーに同意したものとみなされます。"
  ],
  [
    "2. 取得する情報",
    "・ログイン情報: AppleまたはGoogleでのログイン時に提供されるアカウント識別子、メールアドレス、氏名（表示名の初期値として使用）\n・プロフィール情報: 表示名、ユーザーID、自己紹介、プロフィール画像\n・投稿情報: 投稿本文、添付画像、いいね、ブックマーク、リポスト、返信\n・関係情報: フォロー、ミュート、ブロック\n・通知情報: 通知の内容と既読状態\n・端末内の情報: ログイン状態、言語設定、複数アカウント切り替え用のログイン情報（お使いの端末にのみ保存されます）"
  ],
  [
    "3. 利用目的",
    "・本サービスの提供・運営・本人確認\n・投稿やプロフィールの表示、通知の配信などの機能提供\n・不正利用・規約違反への対応\n・不具合の調査と、サービスの改善\n・ユーザーからのお問い合わせへの対応"
  ],
  [
    "4. 公開される情報",
    "表示名、ユーザーID、自己紹介、プロフィール画像、投稿、フォロー・フォロワーの関係は、他のユーザーに公開されます。共有リンクを知る人は、ログインなしで投稿を閲覧できる場合があります。メールアドレスは他のユーザーに公開されません。サブアカウントは、他のユーザーからは別のアカウントとして表示されます。"
  ],
  [
    "5. 第三者への提供・委託",
    "運営者は、次の場合を除き、個人情報を本人の同意なく第三者に提供しません。\n・法令に基づく場合\n・人の生命・身体・財産の保護のために必要な場合\n\n本サービスは、ログイン（Apple、Google）、データの保存・配信（Supabase等のクラウド事業者）に外部サービスを利用しており、これらの提供に必要な範囲で情報が取り扱われます。"
  ],
  [
    "6. 安全管理",
    "運営者は、取得した情報の漏えい・滅失・毀損を防ぐため、アクセス制御や通信の暗号化など、合理的な安全管理措置を講じます。ただし、完全な安全性を保証するものではありません。"
  ],
  [
    "7. 保管期間と削除",
    "情報は、利用目的に必要な期間保管します。ユーザーは、設定画面からいつでもアカウントを削除できます。削除すると、プロフィール、投稿、いいね、ブックマーク、通知などのデータは削除され、元に戻せません。"
  ],
  [
    "8. 開示・訂正・削除の請求",
    "ご自身の情報の開示、訂正、削除などを希望する場合は、上記の問い合わせ先にご連絡ください。本人確認のうえ、法令に従って対応します。プロフィールの編集とアカウントの削除は、アプリ内からも行えます。"
  ],
  [
    "9. 未成年の利用",
    "未成年の方は、保護者の同意を得たうえで本サービスを利用してください。"
  ],
  [
    "10. ポリシーの変更",
    "運営者は、必要に応じて本ポリシーを変更します。変更後の内容は本ページに掲載した時点から効力を生じます。"
  ]
];

const EN: Clause[] = [
  ["Billing information", "Stripe processes payments and handles card and billing information. We do not store full card numbers or security codes. We retain account-linked Stripe customer, subscription and payment identifiers, plan, paid period, refund/cancellation status and notification processing records to provide benefits, verify identity, prevent fraud and meet accounting/legal obligations. Billing information is not public. After account deletion, legally required billing records are retained for the necessary period and information no longer needed is appropriately deleted."],
  [
    "Operator",
    "Operator: Yuta Yamazaki\nLocation: Okayama, Japan\nContact: yuta1102orenge@icloud.com"
  ],
  [
    "1. Introduction",
    "Yytblue (the \"Service\") handles your personal information with care. This Policy explains what information the Service collects, why, and how it is managed. By using the Service you agree to this Policy."
  ],
  [
    "2. Information we collect",
    "- Sign-in information: the account identifier, email address and name provided when you sign in with Apple or Google (the name is used as the initial display name)\n- Profile information: display name, user ID, bio and profile picture\n- Post information: post text, attached images, likes, bookmarks, reposts and replies\n- Relationship information: follows, mutes and blocks\n- Notification information: notification content and read state\n- On-device information: sign-in state, language setting, and sign-in details used to switch between accounts (stored only on your device)"
  ],
  [
    "3. How we use it",
    "- To provide, operate and authenticate users of the Service\n- To show posts and profiles and deliver notifications\n- To respond to abuse and violations of the Terms\n- To investigate bugs and improve the Service\n- To respond to your inquiries"
  ],
  [
    "4. Information that is public",
    "Your display name, user ID, bio, profile picture, posts and follow relationships are visible to other users. Anyone with a share link may view a post without signing in. Your email address is not shown to other users. Sub-accounts appear to other users as separate accounts."
  ],
  [
    "5. Sharing and service providers",
    "We do not share personal information with third parties without your consent, except:\n- when required by law\n- when necessary to protect life, body or property\n\nThe Service uses external providers for sign-in (Apple, Google) and for data storage and delivery (cloud providers such as Supabase). Information is handled by them only as needed to provide those functions."
  ],
  [
    "6. Security",
    "We take reasonable measures, such as access control and encrypted communication, to prevent leakage, loss or damage of information. We cannot guarantee absolute security."
  ],
  [
    "7. Retention and deletion",
    "We keep information for as long as needed for the purposes above. You can delete your account at any time from Settings. Your profile, posts, likes, bookmarks and notifications are then deleted and cannot be restored."
  ],
  [
    "8. Access, correction and deletion requests",
    "To request disclosure, correction or deletion of your information, contact us at the address above. We will respond in accordance with the law after confirming your identity. You can also edit your profile and delete your account in the app."
  ],
  [
    "9. Minors",
    "If you are a minor, please use the Service with the consent of a parent or guardian."
  ],
  [
    "10. Changes to this Policy",
    "We may update this Policy as needed. Updates take effect when posted on this page."
  ]
];

const UPDATED_JA = "最終更新日: 2026年10月22日";
const UPDATED_EN = "Last updated: October 22, 2026";

/** プライバシーポリシー。ログインなしでも読める。 */
export default function PrivacyPage() {
  const { language } = useLanguage();
  const clauses: Clause[] = language === "ja" ? JA : EN;
  return (
    <div className="min-h-dvh bg-muted text-foreground">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-background">
        <header className="sticky top-0 z-10 grid h-12 grid-cols-[44px_1fr_44px] items-center border-b border-border bg-background px-2">
          <Link to="/settings" className="grid h-11 w-11 place-items-center" aria-label={t("戻る")}><ChevronLeft className="h-6 w-6" /></Link>
          <h1 className="text-center text-[17px] font-bold">{t("プライバシーポリシー")}</h1>
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
