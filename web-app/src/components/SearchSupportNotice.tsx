import { t } from "@/lib/language";

export function SearchSupportNotice() {
  return (
    <aside aria-labelledby="search-support-title" className="mt-4 rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-foreground dark:border-amber-900 dark:bg-amber-950/30">
      <h2 id="search-support-title" className="text-base font-semibold">
        {t("少しでもつらさを感じているなら、ひとりで抱えなくて大丈夫です。")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed">
        {t("この検索がご自身の気持ちに関係している場合は、信頼できる人に今の気持ちを伝えてみてください。")}
      </p>
      <p className="mt-2 text-sm leading-relaxed">
        {t("今すぐ自分や誰かの安全を保てないと感じる場合は、地域の緊急サービスに連絡するか、近くにいる人に助けを求めてください。")}
      </p>
      <a
        href="https://www.mhlw.go.jp/mamorouyokokoro/"
        className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[hsl(var(--brand))] underline underline-offset-2"
      >
        {t("日本の相談窓口（厚生労働省）を見る")}
      </a>
    </aside>
  );
}
