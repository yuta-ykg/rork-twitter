import { useAuth } from "@/hooks/authContext";
import { t } from "@/lib/language";
import { useState, type ReactNode } from "react";

const KEY_POINTS: string[] = [
  "他の人を傷つける投稿や、違法な投稿はできません。",
  "投稿やプロフィールは他のユーザーに公開されます。",
  "違反があった場合、投稿の削除やアカウントの停止を行うことがあります。",
];

const keyFor = (id: string): string => `yytblue-terms-accepted-v1:${id}`;

function hasAccepted(id: string): boolean {
  try {
    return localStorage.getItem(keyFor(id)) === "1";
  } catch {
    return false;
  }
}

/** 初回ログイン時に利用規約への同意を求め、同意するまでアプリを表示しない。 */
export default function TermsGate({ children }: { children: ReactNode }) {
  const { owner, signOut } = useAuth();
  const ownerId = owner?.id ?? "";
  const [acceptedId, setAcceptedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<boolean>(false);

  if (!ownerId || acceptedId === ownerId || hasAccepted(ownerId)) return <>{children}</>;

  const accept = (): void => {
    try {
      localStorage.setItem(keyFor(ownerId), "1");
    } catch {
      /* 保存できなくても今回のセッションは進める */
    }
    setAcceptedId(ownerId);
  };

  const link = "font-semibold text-[#1D9BF0] underline-offset-2 hover:underline";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-white px-6 py-10">
      <div className="w-full max-w-[400px] space-y-6">
        <div className="space-y-2">
          <h1 className="text-[26px] font-extrabold text-[#0F1419]">{t("ようこそ、Yytblueへ")}</h1>
          <p className="text-[15px] leading-6 text-[#536471]">
            {t("はじめる前に、利用規約とプライバシーポリシーをご確認ください。")}
          </p>
        </div>
        <ul className="space-y-2 rounded-2xl bg-[#F7F9F9] p-4 text-[14px] leading-6 text-[#0F1419]">
          {KEY_POINTS.map((point) => (
            <li key={point} className="flex gap-2">
              <span aria-hidden className="text-[#1D9BF0]">•</span>
              <span>{t(point)}</span>
            </li>
          ))}
        </ul>
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl border border-[#EFF3F4] p-4">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[#1D9BF0]"
          />
          <span className="text-[15px] leading-6 text-[#0F1419]">
            <a href="/terms" target="_blank" rel="noreferrer" className={link}>{t("利用規約")}</a>
            {t("と")}
            <a href="/privacy" target="_blank" rel="noreferrer" className={link}>{t("プライバシーポリシー")}</a>
            {t("に同意します")}
          </span>
        </label>
        <button
          type="button"
          disabled={!checked}
          onClick={accept}
          className="h-12 w-full rounded-full bg-[#1D9BF0] text-[16px] font-bold text-white transition active:scale-[0.98] disabled:opacity-40"
        >
          {t("同意してはじめる")}
        </button>
        <button type="button" onClick={signOut} className="h-11 w-full text-[14px] font-semibold text-[#536471]">
          {t("同意せずログアウト")}
        </button>
      </div>
    </div>
  );
}
