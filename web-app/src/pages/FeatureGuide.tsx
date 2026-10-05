import { Link } from "react-router-dom";
import { t, useLanguage } from "@/lib/language";

const sections = [
  { title: "投稿", body: "70文字までの投稿を作成し、返信・いいね・ブックマークを使えます。" },
  { title: "投票・クイズ", body: "投稿に投票を付け、回答後に結果を確認できます。クイズでは複数の正解、正解・惜しい・不正解の判定、選択肢ごとのメッセージや解説を設定できます。" },
  { title: "診断", body: "診断を投稿から遊べるほか、診断一覧で探してその場で遊べます。検索からも診断を見つけられ、結果を投稿で共有できます。" },
  { title: "ランキング", body: "投稿はいいね数、ユーザーは投稿への合計いいね数、診断は結果共有数を基準に順位を表示します。" },
  { title: "ゲームセンター", body: "神経衰弱、1024〜16384のパズル、CPU対戦やQRコード・部屋キーで招待した相手との将棋を楽しみ、記録を投稿で共有できます。" },
  { title: "コミュニティ", body: "公開コミュニティを作成・検索・参加できます。作成者とモデレーターはメンバーや投稿を管理し、投稿を固定できます。" },
  { title: "リスト", body: "ユーザーをリストに追加すると、そのユーザーの投稿をまとめて確認できます。公開すると共有リンクで誰でも閲覧できます。" },
  { title: "通知", body: "自分の投稿へのいいね通知を確認し、既読にできます。" },
  { title: "プロフィール", body: "表示名、ユーザー名、自己紹介、プロフィール画像を編集できます。" },
  { title: "設定", body: "テーマ、言語、いいねアイコン、日付表示などを変更できます。" },
  { title: "ゲスト", body: "アカウントなしで試せます。データはこの端末に保存され、30日後に削除されます。" },
  { title: "ミュート・ブロック中のアカウント", body: "ミュートしたアカウントを非表示にし、ブロックしたアカウントとの関係を制限できます。" },
  { title: "PDFとして出力", body: "投稿詳細から投稿をPDFとして保存・共有できます。" },
] as const;

export default function FeatureGuidePage() {
  useLanguage();
  return <main className="mx-auto min-h-dvh max-w-xl bg-background p-5 text-foreground">
    <header className="mb-6 flex min-h-14 items-center gap-5 border-b border-border">
      <Link to="/settings" className="min-h-11 content-center text-[hsl(var(--brand))]">{t("戻る")}</Link>
      <h1 className="text-lg font-semibold">{t("機能ガイド")}</h1>
    </header>
    <p className="mb-6 text-muted-foreground">{t("Irukaの主要機能をまとめています。")}</p>
    <div className="space-y-3">
      {sections.map((section) => <section key={section.title} className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">{t(section.title)}</h2>
        <p className="mt-2 leading-7 text-muted-foreground">{t(section.body)}</p>
      </section>)}
    </div>
    <p className="mt-6 text-sm text-muted-foreground">{t("設定からいつでもこのガイドを開けます。")}</p>
  </main>;
}
