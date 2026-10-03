import { t } from "@/lib/language";

export function CrimePreventionNotice() {
  return (
    <aside aria-labelledby="crime-prevention-title" className="mt-4 rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-foreground dark:border-amber-900 dark:bg-amber-950/30">
      <h2 id="crime-prevention-title" className="text-base font-semibold">
        {t("不審な求人や犯罪への勧誘には注意してください。")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed">
        {t("仕事内容が不明な高額報酬の募集や、荷物・現金の受け取り、口座や携帯電話の提供を求める依頼には応じず、個人情報も送らないでください。")}
      </p>
      <p className="mt-2 text-sm leading-relaxed">
        {t("すでに応募した、脅されている、被害に遭った場合は、やり取りを消さず、警察や信頼できる人に相談してください。身の危険が差し迫っている場合は、地域の警察・緊急窓口に連絡してください。")}
      </p>
      <a
        href="https://www.npa.go.jp/bureau/safetylife/yamibaito/hanzaishaboshu.html"
        className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[hsl(var(--brand))] underline underline-offset-2"
      >
        {t("警察庁「闇バイト」注意情報を見る")}
      </a>
    </aside>
  );
}
