import { t } from "@/lib/language";
import { submitPollResponse, type PollOptionResult, type PostPoll } from "@/lib/polls";
import { useAuth } from "@/hooks/authContext";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const resultStyles: Record<PollOptionResult, string> = {
  correct: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
  close: "border-amber-500 bg-amber-50 dark:bg-amber-950/30",
  incorrect: "border-border bg-muted/50",
};

export function PostPollCard({ postId, initialPoll }: { postId: string; initialPoll: PostPoll }) {
  const { user } = useAuth();
  const [poll, setPoll] = useState(initialPoll);
  const [selected, setSelected] = useState(() => new Set(initialPoll.options.filter((option) => option.selected).map((option) => option.id)));
  const [submitting, setSubmitting] = useState(false);
  const showsResults = poll.hasResponded || poll.options.some((option) => option.voteCount !== null);

  useEffect(() => {
    setPoll(initialPoll);
    setSelected(new Set(initialPoll.options.filter((option) => option.selected).map((option) => option.id)));
  }, [initialPoll]);

  function toggle(optionId: string) {
    if (showsResults || submitting) return;
    setSelected((current) => {
      if (!poll.allowsMultiple) return new Set([optionId]);
      const next = new Set(current);
      if (next.has(optionId)) next.delete(optionId); else next.add(optionId);
      return next;
    });
  }

  async function submit() {
    if (!user) { toast.error(t("回答するにはAppleかGoogleでログインしてください。")); return; }
    if (selected.size === 0 || submitting) return;
    setSubmitting(true);
    try {
      const next = await submitPollResponse(postId, [...selected], user.id);
      setPoll(next);
      setSelected(new Set(next.options.filter((option) => option.selected).map((option) => option.id)));
    } catch { toast.error(t("回答を保存できませんでした。")); }
    finally { setSubmitting(false); }
  }

  return (
    <section className="mt-3 rounded-2xl border border-input p-3" aria-label={t(poll.kind === "quiz" ? "クイズ" : "投票")}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-[hsl(var(--brand))]">{t(poll.kind === "quiz" ? "クイズ" : "投票")}</span>
        <span className="text-xs text-muted-foreground">{poll.responseCount} {t("回答")}</span>
      </div>
      <div className="grid gap-2">
        {poll.options.map((option) => {
          const percent = poll.responseCount > 0 && option.voteCount !== null ? Math.round(option.voteCount / poll.responseCount * 100) : 0;
          const result = showsResults && poll.kind === "quiz" ? option.result : null;
          return (
            <button key={option.id} type="button" disabled={showsResults || submitting} onClick={() => toggle(option.id)}
              aria-pressed={selected.has(option.id)}
              className={`relative min-h-11 overflow-hidden rounded-xl border px-3 py-2 text-left ${result ? resultStyles[result] : selected.has(option.id) ? "border-[hsl(var(--brand))] bg-muted" : "border-input"}`}>
              {showsResults && option.voteCount !== null ? <span className="absolute inset-y-0 left-0 bg-[hsl(var(--brand))]/10" style={{ width: `${percent}%` }} aria-hidden /> : null}
              <span className="relative flex items-start justify-between gap-3">
                <span>
                  <span className="block text-sm font-medium">{option.text}</span>
                  {result ? <span className="mt-1 block text-xs font-semibold">{option.feedback || t(result === "correct" ? "正解" : result === "close" ? "惜しい" : "不正解")}</span> : null}
                </span>
                {showsResults && option.voteCount !== null ? <span className="shrink-0 text-sm tabular-nums">{percent}%</span> : null}
              </span>
            </button>
          );
        })}
      </div>
      {!showsResults ? (
        <button type="button" disabled={selected.size === 0 || submitting} onClick={() => void submit()}
          className="mt-3 min-h-11 w-full rounded-full bg-[hsl(var(--brand))] px-4 text-sm font-semibold text-white disabled:opacity-40">
          {t(submitting ? "回答を送信中…" : "回答する")}
        </button>
      ) : null}
      {showsResults && poll.explanation ? <p className="mt-3 rounded-xl bg-muted p-3 text-sm leading-relaxed"><strong>{t("解説")}: </strong>{poll.explanation}</p> : null}
      {!showsResults && poll.allowsMultiple ? <p className="mt-2 text-xs text-muted-foreground">{t("複数選択できます。")}</p> : null}
    </section>
  );
}
