import { t } from "@/lib/language";

export function ConsumerProtectionNotice() {
  return (
    <aside aria-labelledby="consumer-protection-title" className="mt-4 rounded-2xl border border-sky-300 bg-sky-50/80 p-4 text-foreground dark:border-sky-900 dark:bg-sky-950/30">
      <h2 id="consumer-protection-title" className="text-base font-semibold">
        {t("取引や広告の表示に不審な点がある場合は、消費者庁の情報を確認できます。")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed">
        {t("詐欺的な勧誘、誤解を招く広告、価格や定期購入の条件、口コミなどに不審な点があれば、画面、URL、領収書、事業者とのやり取りを保存してください。")}
      </p>
      <p className="mt-2 text-sm leading-relaxed">
        {t("契約・購入トラブルは消費者ホットラインに相談できます。景品表示法違反と思われる情報は消費者庁へ提供できます。身の危険や犯罪被害が迫っている場合は警察へ連絡してください。")}
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4">
        <a
          href="https://www.caa.go.jp/policies/policy/local_cooperation/local_consumer_administration/hotline/"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-[hsl(var(--brand))] underline underline-offset-2"
        >
          {t("消費者庁「消費者ホットライン188」を見る")}
        </a>
        <a
          href="https://www.caa.go.jp/policies/policy/representation/contact/"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-[hsl(var(--brand))] underline underline-offset-2"
        >
          {t("消費者庁の景品表示法に関する情報提供・相談窓口を見る")}
        </a>
      </div>
    </aside>
  );
}
