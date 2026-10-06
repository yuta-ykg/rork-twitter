import { t, useLanguage } from "@/lib/language";
import { ArrowLeft, ChartColumn, CircleHelp, Stethoscope } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/authContext";
import { displayName, userHandle } from "@/hooks/authUser";
import { useOwnProfile } from "@/hooks/useOwnProfile";
import { insertPost, MAX_CHARACTERS } from "@/lib/posts";
import { Avatar, PostButton } from "@/pages/IndexShared";
import { PollDraftEditor } from "@/components/PollDraftEditor";
import { isPollDraftValid, newPollDraft, type PollDraft } from "@/lib/polls";
import { DiagnosisDraftEditor } from "@/components/DiagnosisDraftEditor";
import { isDiagnosisDraftValid, newDiagnosisDraft, type DiagnosisDraft } from "@/lib/diagnoses";

type ComposeMode = "none" | "poll" | "quiz" | "diagnosis";

/** 投稿作成の専用ページ（/compose）。FAB・メニュー・「いまどうしてる？」から遷移する。 */
export default function ComposePage() {
  useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const own = useOwnProfile();
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<ComposeMode>("none");
  const [poll, setPoll] = useState<PollDraft | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisDraft | null>(null);
  const [error, setError] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const count = draft.length;
  const canPost = draft.trim().length > 0 && count <= MAX_CHARACTERS && isPollDraftValid(poll) && isDiagnosisDraftValid(diagnosis);

  if (!user) return null;

  function goBack() {
    if (window.history.length > 1) navigate(-1);
    else navigate("/", { replace: true });
  }

  /** アイコンで投票・クイズ・診断を切り替える。押した項目の編集UIがアイコン行の上に現れる。 */
  function chooseMode(next: Exclude<ComposeMode, "none">) {
    if (mode === next) {
      setMode("none");
      setPoll(null);
      setDiagnosis(null);
      return;
    }
    setMode(next);
    if (next === "diagnosis") {
      setPoll(null);
      setDiagnosis((current) => current ?? newDiagnosisDraft());
    } else {
      setDiagnosis(null);
      setPoll((current) => (current?.kind === next ? current : newPollDraft(next)));
    }
  }

  async function submit() {
    if (!canPost || isPosting) return;
    setIsPosting(true);
    setError("");
    try {
      await insertPost(draft.trim(), user, poll, diagnosis);
      goBack();
    } catch {
      setError(t("投稿できませんでした。もう一度試してください。"));
      setIsPosting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[430px]">
      <div className="sticky top-0 z-10 -mx-5 mb-2 flex items-center gap-1 border-b border-border/80 bg-background/75 px-4 py-2 backdrop-blur-xl">
        <button type="button" onClick={goBack} aria-label={t("戻る")} className="grid h-11 w-11 place-items-center text-[hsl(var(--brand))]">
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <h1 className="text-[17px] font-semibold text-foreground">{t("新しい投稿")}</h1>
      </div>
      <div className="mb-4 flex items-center gap-3">
        <Avatar initial={own?.initial ?? displayName(user).slice(0, 1)} index={0} />
        <div>
          <p className="text-base font-semibold text-foreground">{own?.name ?? displayName(user)}</p>
          <p className="text-sm text-muted-foreground">{own?.handle ?? userHandle(user)}</p>
        </div>
      </div>
      <div className="relative min-h-[220px] rounded-2xl bg-muted">
        {count === 0 ? (
          <p className="pointer-events-none absolute left-3.5 top-4 text-[17px] text-muted-foreground">{t("今の気持ちを、70字まで。")}</p>
        ) : null}
        <textarea
          autoFocus
          value={draft}
          maxLength={MAX_CHARACTERS}
          onChange={(event) => setDraft(event.target.value.slice(0, MAX_CHARACTERS))}
          className="h-[220px] w-full resize-none bg-transparent p-3.5 text-[17px] text-foreground outline-none"
          aria-label={t("投稿本文")}
        />
      </div>
      <p className={`mt-3 text-right font-mono text-[15px] ${count >= MAX_CHARACTERS ? "text-red-500" : "text-muted-foreground"}`}>
        {count} / {MAX_CHARACTERS}
      </p>
      {mode === "diagnosis" && diagnosis ? (
        <DiagnosisDraftEditor value={diagnosis} onChange={setDiagnosis} />
      ) : poll && (mode === "poll" || mode === "quiz") ? (
        <PollDraftEditor value={poll} onChange={setPoll} />
      ) : null}
      <div className="mt-3 flex items-center gap-1" role="group" aria-label={t("投稿形式")}>
        <ModeIcon icon={ChartColumn} label={t("投票")} active={mode === "poll"} onClick={() => chooseMode("poll")} />
        <ModeIcon icon={CircleHelp} label={t("クイズ")} active={mode === "quiz"} onClick={() => chooseMode("quiz")} />
        <ModeIcon icon={Stethoscope} label={t("診断")} active={mode === "diagnosis"} onClick={() => chooseMode("diagnosis")} />
      </div>
      {error ? <p role="alert" className="mt-3 text-sm text-red-500">{error}</p> : null}
      <div className="mb-8 mt-4">
        <PostButton label={t("投稿する")} disabled={!canPost || isPosting} onClick={() => void submit()} />
      </div>
    </div>
  );
}

/** 投稿形式のアイコンボタン。押すと対応する編集UIが上に現れ、もう一度押すと閉じる。 */
function ModeIcon({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-11 w-11 place-items-center rounded-xl transition active:scale-95 ${active ? "bg-[hsl(var(--brand))]/10 text-[hsl(var(--brand))]" : "text-muted-foreground hover:text-foreground"}`}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}
