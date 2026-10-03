import { useAuth } from "@/hooks/authContext";
import { t } from "@/lib/language";
import { shareDiagnosisResultPost, type Post } from "@/lib/posts";
import type { PostDiagnosis } from "@/lib/diagnoses";
import { useState } from "react";
import { toast } from "sonner";

export function PostDiagnosisCard({ diagnosis, onShared }: { diagnosis: PostDiagnosis; onShared: (post: Post) => void }) {
  const { user } = useAuth();
  const [questionIndex, setQuestionIndex] = useState<number | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [resultIndex, setResultIndex] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);

  function start() {
    setQuestionIndex(0);
    setScores(Array(diagnosis.outcomes.length).fill(0));
    setResultIndex(null);
  }

  function choose(outcomeIndex: number) {
    if (questionIndex === null) return;
    const nextScores = [...scores];
    nextScores[outcomeIndex] = (nextScores[outcomeIndex] ?? 0) + 1;
    if (questionIndex + 1 === diagnosis.questions.length) {
      setScores(nextScores);
      setQuestionIndex(null);
      setResultIndex(nextScores.reduce((best, score, index) => score > nextScores[best] ? index : best, 0));
    } else {
      setScores(nextScores);
      setQuestionIndex(questionIndex + 1);
    }
  }

  async function shareResult() {
    if (!user) { toast.error(t("結果を共有するにはログインしてください。")); return; }
    if (resultIndex === null || sharing) return;
    setSharing(true);
    try {
      const post = await shareDiagnosisResultPost(diagnosis, resultIndex, user);
      toast.success(t("診断結果を投稿しました。"));
      onShared(post);
    } catch {
      toast.error(t("診断結果を投稿できませんでした。"));
    } finally { setSharing(false); }
  }

  const outcome = resultIndex === null ? null : diagnosis.outcomes[resultIndex];
  const currentQuestion = questionIndex === null ? null : diagnosis.questions[questionIndex];

  return (
    <section className="mt-3 rounded-2xl border border-[hsl(var(--brand))]/30 bg-[hsl(var(--brand))]/5 p-3" aria-label={t("診断") }>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[hsl(var(--brand))]">{t("みんなで遊べる診断")}</p>
          <h3 className="mt-1 text-base font-semibold">{diagnosis.title}</h3>
          {diagnosis.description ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{diagnosis.description}</p> : null}
        </div>
        <span className="shrink-0 rounded-full bg-background px-2 py-1 text-xs text-muted-foreground">{diagnosis.questions.length} {t("問")}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t("遊び・エンタメ用の診断です。医療や病気の判定には使わないでください。")}</p>

      {currentQuestion ? (
        <div className="mt-3 grid gap-2" aria-live="polite">
          <p className="text-sm font-semibold">{t("質問")} {questionIndex! + 1}/{diagnosis.questions.length}：{currentQuestion.prompt}</p>
          {currentQuestion.options.map((option, index) => <button key={`${questionIndex}-${index}`} type="button"
            onClick={() => choose(option.resultIndex)} className="min-h-11 rounded-xl border border-input bg-background px-3 py-2 text-left text-sm hover:border-[hsl(var(--brand))]">
            {option.text}
          </button>)}
        </div>
      ) : outcome ? (
        <div className="mt-3 rounded-xl bg-background p-3" aria-live="polite">
          <p className="text-xs font-semibold text-[hsl(var(--brand))]">{t("あなたの診断結果")}</p>
          <h4 className="mt-1 text-lg font-bold">{outcome.title}</h4>
          {outcome.description ? <p className="mt-1 text-sm leading-relaxed">{outcome.description}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={sharing} onClick={() => void shareResult()} className="min-h-11 rounded-full bg-[hsl(var(--brand))] px-4 text-sm font-semibold text-white disabled:opacity-50">
              {t(sharing ? "投稿中…" : "結果を投稿で共有")}
            </button>
            <button type="button" onClick={start} className="min-h-11 rounded-full border border-input px-4 text-sm">{t("もう一度遊ぶ")}</button>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-xl bg-background p-3">
          {diagnosis.result ? <p className="mb-2 text-sm">{t("この投稿者の結果")}: <strong>{diagnosis.result.title}</strong></p> : null}
          <button type="button" onClick={start} className="min-h-11 w-full rounded-full bg-[hsl(var(--brand))] px-4 text-sm font-semibold text-white">
            {t("診断をやってみる")}
          </button>
        </div>
      )}
    </section>
  );
}
