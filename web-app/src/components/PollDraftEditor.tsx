import { t } from "@/lib/language";
import { newPollDraft, type PollDraft, type PollKind, type PollOptionResult } from "@/lib/polls";

export function PollDraftEditor({ value, onChange }: { value: PollDraft | null; onChange: (draft: PollDraft | null) => void }) {
  function chooseKind(kind: PollKind | null) {
    if (!kind) { onChange(null); return; }
    if (value?.kind === kind) return;
    onChange(newPollDraft(kind));
  }

  function updateOption(index: number, patch: Partial<PollDraft["options"][number]>) {
    if (!value) return;
    const options = value.options.map((option, optionIndex) => optionIndex === index ? { ...option, ...patch } : option);
    const hasMultipleCorrectAnswers = value.kind === "quiz" && options.filter((option) => option.result === "correct").length > 1;
    onChange({ ...value, options, allowsMultiple: value.allowsMultiple || hasMultipleCorrectAnswers });
  }

  return (
    <section className="mt-4 rounded-2xl border border-input p-3" aria-label={t("投票・クイズ")}>
      <div className="grid grid-cols-3 rounded-xl bg-muted p-1" role="group" aria-label={t("投稿形式")}>
        {([null, "poll", "quiz"] as const).map((kind) => (
          <button key={kind ?? "none"} type="button" aria-pressed={(value?.kind ?? null) === kind}
            onClick={() => chooseKind(kind)}
            className={`min-h-10 rounded-lg px-2 text-sm font-medium ${(value?.kind ?? null) === kind ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
            {t(kind === "poll" ? "投票" : kind === "quiz" ? "クイズ" : "なし")}
          </button>
        ))}
      </div>
      {value ? (
        <div className="mt-3 grid gap-3">
          {value.options.map((option, index) => (
            <div key={index} className="rounded-xl bg-muted/60 p-3">
              <div className="flex gap-2">
                <input value={option.text} maxLength={60}
                  onChange={(event) => updateOption(index, { text: event.target.value })}
                  aria-label={`${t("選択肢")} ${index + 1}`}
                  placeholder={`${t("選択肢")} ${index + 1}`}
                  className="min-h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3" />
                {value.options.length > 2 ? <button type="button" onClick={() => onChange({ ...value, options: value.options.filter((_, optionIndex) => optionIndex !== index) })}
                  className="min-h-11 px-2 text-sm text-red-600" aria-label={`${t("選択肢を削除")} ${index + 1}`}>{t("削除")}</button> : null}
              </div>
              {value.kind === "quiz" ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <select value={option.result} onChange={(event) => updateOption(index, { result: event.target.value as PollOptionResult })}
                    aria-label={`${t("判定")} ${index + 1}`} className="min-h-11 rounded-lg border border-input bg-background px-3">
                    <option value="correct">{t("正解")}</option>
                    <option value="close">{t("惜しい")}</option>
                    <option value="incorrect">{t("不正解")}</option>
                  </select>
                  <input value={option.feedback} maxLength={60}
                    onChange={(event) => updateOption(index, { feedback: event.target.value })}
                    aria-label={`${t("回答後のメッセージ")} ${index + 1}`}
                    placeholder={t("回答後のメッセージ（任意）")}
                    className="min-h-11 rounded-lg border border-input bg-background px-3" />
                </div>
              ) : null}
            </div>
          ))}
          {value.options.length < 6 ? <button type="button"
            onClick={() => onChange({ ...value, options: [...value.options, { text: "", result: "incorrect", feedback: "" }] })}
            className="min-h-11 rounded-full border border-input px-4 text-sm font-semibold text-[hsl(var(--brand))]">
            {t("選択肢を追加")}
          </button> : null}
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" checked={value.allowsMultiple}
              disabled={value.kind === "quiz" && value.options.filter((option) => option.result === "correct").length > 1}
              onChange={(event) => onChange({ ...value, allowsMultiple: event.target.checked })} className="h-5 w-5" />
            <span>{t("複数の選択肢を回答できるようにする")}</span>
          </label>
          {value.kind === "quiz" ? (
            <label className="text-sm">{t("回答後の解説（任意）")}
              <textarea value={value.explanation} maxLength={280}
                onChange={(event) => onChange({ ...value, explanation: event.target.value })}
                className="mt-1 min-h-20 w-full rounded-lg border border-input bg-background p-3" />
            </label>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {t(value.kind === "quiz" ? "正解は複数設定できます。複数正解の場合は複数選択となり、判定は回答後に表示されます。" : "回答後に投票結果を表示します。")}
          </p>
        </div>
      ) : null}
    </section>
  );
}
