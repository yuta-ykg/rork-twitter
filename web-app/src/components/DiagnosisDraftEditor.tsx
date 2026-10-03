import { t } from "@/lib/language";
import type { DiagnosisDraft } from "@/lib/diagnoses";

export function DiagnosisDraftEditor({ value, onChange }: { value: DiagnosisDraft; onChange: (draft: DiagnosisDraft) => void }) {
  function removeOutcome(removeIndex: number) {
    if (value.outcomes.length <= 2) return;
    const outcomes = value.outcomes.filter((_, index) => index !== removeIndex);
    const questions = value.questions.map((question) => ({ ...question, options: question.options.map((option) => ({
      ...option,
      resultIndex: option.resultIndex === removeIndex ? Math.min(removeIndex, outcomes.length - 1)
        : option.resultIndex > removeIndex ? option.resultIndex - 1 : option.resultIndex,
    })) }));
    onChange({ ...value, outcomes, questions });
  }

  return (
    <section className="mt-4 grid gap-4 rounded-2xl border border-input p-3" aria-label={t("診断を作る")}>
      <div>
        <h3 className="font-semibold">{t("診断を作る")}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("遊び・エンタメ用の診断です。医療や病気の判定には使わないでください。")}</p>
      </div>
      <label className="grid gap-1 text-sm">{t("診断タイトル")}
        <input value={value.title} maxLength={60} onChange={(event) => onChange({ ...value, title: event.target.value })}
          className="min-h-11 rounded-lg border border-input bg-background px-3" />
      </label>
      <label className="grid gap-1 text-sm">{t("診断の説明（任意）")}
        <textarea value={value.description} maxLength={160} onChange={(event) => onChange({ ...value, description: event.target.value })}
          className="min-h-16 rounded-lg border border-input bg-background p-3" />
      </label>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">{t("診断結果")}</h4>
          {value.outcomes.length < 6 ? <button type="button" className="min-h-11 px-2 text-sm text-[hsl(var(--brand))]"
            onClick={() => onChange({ ...value, outcomes: [...value.outcomes, { title: "", description: "" }] })}>{t("結果を追加")}</button> : null}
        </div>
        {value.outcomes.map((outcome, index) => (
          <div key={index} className="grid gap-2 rounded-xl bg-muted/60 p-3">
            <div className="flex gap-2">
              <input value={outcome.title} maxLength={40} aria-label={`${t("診断結果")} ${index + 1}`}
                placeholder={`${t("結果名")} ${index + 1}`}
                onChange={(event) => onChange({ ...value, outcomes: value.outcomes.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) })}
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3" />
              {value.outcomes.length > 2 ? <button type="button" aria-label={t("結果を削除")} onClick={() => removeOutcome(index)} className="min-h-11 px-2 text-sm text-red-600">{t("削除")}</button> : null}
            </div>
            <textarea value={outcome.description} maxLength={160} aria-label={`${t("結果の説明")} ${index + 1}`}
              placeholder={t("結果の説明")}
              onChange={(event) => onChange({ ...value, outcomes: value.outcomes.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item) })}
              className="min-h-16 rounded-lg border border-input bg-background p-3" />
          </div>
        ))}
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">{t("質問")}</h4>
          {value.questions.length < 10 ? <button type="button" className="min-h-11 px-2 text-sm text-[hsl(var(--brand))]"
            onClick={() => onChange({ ...value, questions: [...value.questions, { prompt: "", options: [{ text: "", resultIndex: 0 }, { text: "", resultIndex: 1 }] }] })}>{t("質問を追加")}</button> : null}
        </div>
        {value.questions.map((question, questionIndex) => (
          <div key={questionIndex} className="grid gap-3 rounded-xl bg-muted/60 p-3">
            <div className="flex gap-2">
              <input value={question.prompt} maxLength={120} aria-label={`${t("質問")} ${questionIndex + 1}`}
                placeholder={`${t("質問")} ${questionIndex + 1}`}
                onChange={(event) => onChange({ ...value, questions: value.questions.map((item, itemIndex) => itemIndex === questionIndex ? { ...item, prompt: event.target.value } : item) })}
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3" />
              {value.questions.length > 1 ? <button type="button" aria-label={t("質問を削除")} onClick={() => onChange({ ...value, questions: value.questions.filter((_, index) => index !== questionIndex) })} className="min-h-11 px-2 text-sm text-red-600">{t("削除")}</button> : null}
            </div>
            {question.options.map((option, optionIndex) => (
              <div key={optionIndex} className="grid gap-2 sm:grid-cols-2">
                <div className="flex gap-2">
                  <input value={option.text} maxLength={60} aria-label={`${t("回答の選択肢")} ${questionIndex + 1}-${optionIndex + 1}`}
                    placeholder={`${t("選択肢")} ${optionIndex + 1}`}
                    onChange={(event) => onChange({ ...value, questions: value.questions.map((item, itemIndex) => itemIndex === questionIndex ? { ...item, options: item.options.map((answer, answerIndex) => answerIndex === optionIndex ? { ...answer, text: event.target.value } : answer) } : item) })}
                    className="min-h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3" />
                  {question.options.length > 2 ? <button type="button" aria-label={t("選択肢を削除")} onClick={() => onChange({ ...value, questions: value.questions.map((item, itemIndex) => itemIndex === questionIndex ? { ...item, options: item.options.filter((_, index) => index !== optionIndex) } : item) })} className="min-h-11 px-1 text-sm text-red-600">{t("削除")}</button> : null}
                </div>
                <select value={option.resultIndex} aria-label={t("この回答が示す結果")}
                  onChange={(event) => onChange({ ...value, questions: value.questions.map((item, itemIndex) => itemIndex === questionIndex ? { ...item, options: item.options.map((answer, answerIndex) => answerIndex === optionIndex ? { ...answer, resultIndex: Number(event.target.value) } : answer) } : item) })}
                  className="min-h-11 rounded-lg border border-input bg-background px-3">
                  {value.outcomes.map((item, outcomeIndex) => <option key={outcomeIndex} value={outcomeIndex}>{item.title.trim() || `${t("結果名")} ${outcomeIndex + 1}`}</option>)}
                </select>
              </div>
            ))}
            {question.options.length < 6 ? <button type="button" className="min-h-10 justify-self-start px-2 text-sm text-[hsl(var(--brand))]"
              onClick={() => onChange({ ...value, questions: value.questions.map((item, itemIndex) => itemIndex === questionIndex ? { ...item, options: [...item.options, { text: "", resultIndex: 0 }] } : item) })}>{t("選択肢を追加")}</button> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
