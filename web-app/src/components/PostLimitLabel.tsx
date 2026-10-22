import { t } from "@/lib/language";

type Props = { limit: number; ready: boolean; plan?: string; count?: number };

export function PostLimitLabel({ limit, ready, plan, count }: Props) {
  if (count !== undefined) {
    return <span className={`font-mono text-[13px] ${ready && count > limit ? "text-destructive" : ready && count >= limit - 10 ? "text-orange-500" : "text-muted-foreground"}`}>{count} / {ready ? limit : "—"}</span>;
  }
  return <p className="text-[13px] text-muted-foreground">{ready ? <>{plan === "free" ? t("無料プラン") : plan === "plus" ? "Plus" : "Premium"} · {t("投稿文字数上限")}: <span className="font-mono">{limit}</span></> : <>{t("投稿文字数上限")}: —</>}</p>;
}
