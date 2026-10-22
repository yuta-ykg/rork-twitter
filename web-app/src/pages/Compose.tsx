import { useEffect, useMemo, useRef, useState } from "react";
import { ChartBar, ImagePlus, Plus, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Avatar, QuoteCard, useTimeline } from "@/components/TweetFeed";
import { useAuth } from "@/hooks/authContext";
import { useOwnProfile } from "@/hooks/useOwnProfile";
import { t, useLanguage } from "@/lib/language";
import { PostLimitLabel } from "@/components/PostLimitLabel";
import { PostBodyInput } from "@/components/PostBodyInput";
import { usePostLimit } from "@/lib/accountPlan";
import { insertPost, type PollDraft } from "@/lib/posts";
import { MAX_POLL_OPTIONS, MAX_POLL_OPTION_CHARS } from "@/lib/polls";

const DURATIONS: { minutes: number; label: string }[] = [
  { minutes: 60, label: "1時間" },
  { minutes: 1440, label: "1日" },
  { minutes: 4320, label: "3日" },
  { minutes: 10080, label: "7日" },
];
const MIN_DURATION = 5;
const MAX_DURATION = 10080;

export default function ComposePage() {
  useLanguage();
  const { user } = useAuth();
  const entitlement = usePostLimit();
  const MAX_CHARACTERS = entitlement.limit;
  const own = useOwnProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const quoteId = params.get("quote");
  const replyId = params.get("reply");
  const timeline = useTimeline();
  const quoted = quoteId ? timeline.data?.find((item) => item.id === quoteId) : undefined;
  const replyTarget = replyId ? timeline.data?.find((item) => item.id === replyId) : undefined;
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [pollOn, setPollOn] = useState<boolean>(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [duration, setDuration] = useState<number>(1440);
  const [customDuration, setCustomDuration] = useState<boolean>(false);
  const [customDays, setCustomDays] = useState<string>("1");
  const [customHours, setCustomHours] = useState<string>("0");
  const [customMinutes, setCustomMinutes] = useState<string>("0");
  const effectiveDuration = customDuration
    ? (parseInt(customDays || "0", 10) || 0) * 1440 + (parseInt(customHours || "0", 10) || 0) * 60 + (parseInt(customMinutes || "0", 10) || 0)
    : duration;
  const durationValid = effectiveDuration >= MIN_DURATION && effectiveDuration <= MAX_DURATION;
  const filledOptions = pollOptions.map((option) => option.trim()).filter((option) => option.length > 0);
  const pollValid = !pollOn || (filledOptions.length >= 2 && durationValid);
  const fileInput = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const count = Array.from(draft).length;
  const trimmed = draft.trim();
  const canPost = entitlement.ready && trimmed.length > 0 && Array.from(trimmed).length <= MAX_CHARACTERS && !sending && pollValid;

  function change(value: string) {
    setDraft(value);
  }

  async function submit() {
    if (!canPost || !user) return;
    setSending(true);
    try {
      const poll: PollDraft | null = pollOn ? { options: filledOptions, durationMinutes: effectiveDuration } : null;
      await insertPost(trimmed, user, image, quoteId, replyId, poll);
      await queryClient.invalidateQueries({ queryKey: ["timeline", user.id] });
      navigate(replyId ? `/post/${replyId}` : "/", { replace: true });
    } catch {
      toast.error(t("投稿できませんでした。もう一度試してください。"));
      setSending(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
        <header className="flex h-12 items-center justify-between px-3">
          <button type="button" onClick={() => navigate(-1)} className="h-11 px-2 text-[15px] text-foreground">{t("キャンセル")}</button>
          <button
            type="button"
            onClick={() => { void submit(); }}
            disabled={!canPost}
            className="h-8 rounded-full bg-[#1D9BF0] px-4 text-[15px] font-bold text-white disabled:opacity-40"
          >
            {replyId ? t("返信する") : t("投稿する")}
          </button>
        </header>
        <div className="px-4 pb-2">
          <PostLimitLabel limit={MAX_CHARACTERS} ready={entitlement.ready} plan={entitlement.data?.plan} />
        </div>
        {replyId ? (
          <div className="px-4 pt-1">
            <QuoteCard post={replyTarget} />
            <p className="pt-2 text-[14px] text-muted-foreground">
              {t("返信先")} <span className="text-[#1D9BF0]">{replyTarget?.handle ?? ""}</span>
            </p>
          </div>
        ) : null}
        {!entitlement.ready && <div className="px-4 py-2 text-sm" role="status">{t(entitlement.isError ? "契約情報を取得できませんでした。" : "読み込み中…")}<button type="button" onClick={() => void entitlement.refetch()} className="min-h-11 px-3 text-[#1D9BF0]">{t("再読み込み")}</button></div>}
        <div className="flex gap-3 px-4 pt-2">
          <Avatar initial={own?.initial ?? "あ"} index={0} url={own?.avatar} size={40} />
          <PostBodyInput
            characterLimit={MAX_CHARACTERS}
            limitReady={entitlement.ready}
            value={draft}
            onChange={(event) => change(event.target.value)}
            placeholder={replyId ? t("返信を投稿") : t("今の気持ちを。")}
            className="h-40 w-full resize-none overflow-y-auto bg-transparent text-lg outline-none placeholder:text-muted-foreground"
            autoFocus
          />
        </div>
        {entitlement.ready && entitlement.data?.plan === "free" && count > 280 && (
          <p role="status" className="mx-4 ml-[68px] mt-2">
            <Link to="/plans#plus" className="flex min-h-11 items-center rounded-xl bg-[#1D9BF0]/10 px-3 py-2 text-sm text-[#1D9BF0] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1D9BF0]">
              {t("無料プランは280字までです。Plusなら500字まで投稿できます。")}
            </Link>
          </p>
        )}
        {preview ? (
          <div className="relative mx-4 ml-[68px] mt-2 overflow-hidden rounded-2xl border border-border">
            <img src={preview} alt={t("選んだ画像")} className="max-h-80 w-full object-cover" />
            <button
              type="button"
              onClick={() => setImage(null)}
              aria-label={t("画像を外す")}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/65 text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        {pollOn ? (
          <div className="mx-4 ml-[68px] mt-3 space-y-2 rounded-2xl border border-border p-3">
            {pollOptions.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={option}
                  onChange={(event) => setPollOptions((list) => list.map((item, i) => i === index ? Array.from(event.target.value).slice(0, MAX_POLL_OPTION_CHARS).join("") : item))}
                  placeholder={`${t("選択肢")} ${index + 1}`}
                  aria-label={`${t("選択肢")} ${index + 1}`}
                  className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-3 text-[15px] outline-none focus:border-[#1D9BF0]"
                />
                {pollOptions.length > 2 ? (
                  <button type="button" aria-label={t("選択肢を削除")} onClick={() => setPollOptions((list) => list.filter((_, i) => i !== index))} className="grid h-11 w-11 place-items-center text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
            {pollOptions.length < MAX_POLL_OPTIONS ? (
              <button type="button" onClick={() => setPollOptions((list) => [...list, ""])} className="flex h-11 items-center gap-1 text-[15px] font-bold text-[#1D9BF0]">
                <Plus className="h-4 w-4" />{t("選択肢を追加")}
              </button>
            ) : null}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[14px] text-muted-foreground">{t("期間")}</span>
                <div className="flex flex-1 flex-wrap gap-1">
                  {DURATIONS.map((item) => (
                    <button
                      key={item.minutes}
                      type="button"
                      onClick={() => { setCustomDuration(false); setDuration(item.minutes); }}
                      aria-pressed={!customDuration && duration === item.minutes}
                      className={`h-9 flex-1 rounded-full px-2 text-[13px] font-bold ${!customDuration && duration === item.minutes ? "bg-[#1D9BF0] text-white" : "bg-muted text-foreground"}`}
                    >
                      {t(item.label)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      if (!customDuration) {
                        const d = Math.floor(duration / 1440);
                        const h = Math.floor((duration % 1440) / 60);
                        const m = duration % 60;
                        setCustomDays(String(d));
                        setCustomHours(String(h));
                        setCustomMinutes(String(m));
                      }
                      setCustomDuration(true);
                    }}
                    aria-pressed={customDuration}
                    className={`h-9 flex-1 rounded-full px-2 text-[13px] font-bold ${customDuration ? "bg-[#1D9BF0] text-white" : "bg-muted text-foreground"}`}
                  >
                    {t("カスタム")}
                  </button>
                </div>
              </div>
              {customDuration ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <label className="flex flex-1 items-center gap-1">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={7}
                        value={customDays}
                        onChange={(event) => setCustomDays(event.target.value.replace(/\D/g, "").slice(0, 2))}
                        aria-label={t("日").trim()}
                        className="h-11 w-full rounded-lg border border-input bg-transparent px-2 text-center text-[15px] outline-none focus:border-[#1D9BF0]"
                      />
                      <span className="text-[13px] text-muted-foreground">{t("日").trim()}</span>
                    </label>
                    <label className="flex flex-1 items-center gap-1">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={23}
                        value={customHours}
                        onChange={(event) => setCustomHours(event.target.value.replace(/\D/g, "").slice(0, 2))}
                        aria-label={t("時間").trim()}
                        className="h-11 w-full rounded-lg border border-input bg-transparent px-2 text-center text-[15px] outline-none focus:border-[#1D9BF0]"
                      />
                      <span className="text-[13px] text-muted-foreground">{t("時間").trim()}</span>
                    </label>
                    <label className="flex flex-1 items-center gap-1">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={59}
                        value={customMinutes}
                        onChange={(event) => setCustomMinutes(event.target.value.replace(/\D/g, "").slice(0, 2))}
                        aria-label={t("分").trim()}
                        className="h-11 w-full rounded-lg border border-input bg-transparent px-2 text-center text-[15px] outline-none focus:border-[#1D9BF0]"
                      />
                      <span className="text-[13px] text-muted-foreground">{t("分").trim()}</span>
                    </label>
                  </div>
                  {!durationValid ? (
                    <p className="text-[12px] text-destructive">{t("5分〜7日（10080分）の間で設定してください。")}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        {quoteId ? <div className="mx-4 ml-[68px]"><QuoteCard post={quoted} /></div> : null}
        <div className="mt-auto flex items-center justify-between border-t border-border px-4 py-2 pb-5">
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => { setImage(event.target.files?.[0] ?? null); event.target.value = ""; }}
          />
          <div className="flex items-center">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            aria-label={t("画像を追加")}
            className="grid h-11 w-11 place-items-center rounded-full text-[#1D9BF0] active:bg-[#1D9BF0]/10"
          >
            <ImagePlus className="h-[22px] w-[22px]" />
          </button>
          {!replyId && !quoteId ? (
            <button
              type="button"
              onClick={() => setPollOn((on) => !on)}
              aria-pressed={pollOn}
              aria-label={t("投票を追加")}
              className={`grid h-11 w-11 place-items-center rounded-full text-[#1D9BF0] active:bg-[#1D9BF0]/10 ${pollOn ? "bg-[#1D9BF0]/10" : ""}`}
            >
              <ChartBar className="h-[22px] w-[22px]" />
            </button>
          ) : null}
          </div>
          <PostLimitLabel count={count} limit={MAX_CHARACTERS} ready={entitlement.ready} />
        </div>
      </div>
    </div>
  );
}
