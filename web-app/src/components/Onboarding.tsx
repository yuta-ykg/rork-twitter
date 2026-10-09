import { useState, type ReactNode } from "react";
import { ArrowRight, Heart, MessageCircle, Repeat2 } from "lucide-react";

import { AppleMark, GoogleMark } from "@/components/BrandMarks";
import { t } from "@/lib/language";

export const ONBOARDED_KEY = "iruka:onboarded";

type Slide = { title: string; body: string; visual: ReactNode };

function PostMock() {
  return (
    <div className="w-full rounded-3xl border border-border bg-[#F7F9F9] p-4 shadow-[0_8px_30px_rgba(29,155,240,0.12)]">
      <div className="flex items-center gap-2.5">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#8ECAE6] font-bold text-[#0F1419]">ミ</div>
        <div className="text-[15px] leading-tight">
          <p className="font-bold">{t("ミナ")}</p>
          <p className="text-muted-foreground">@mina</p>
        </div>
      </div>
      <p className="mt-3 text-[19px] font-bold leading-snug">{t("今日の海は、いつもより少しだけ青かった。")}</p>
      <div className="mt-4 flex items-center justify-between">
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-border">
          <div className="h-full w-[60%] rounded-full bg-[hsl(var(--brand))]" />
        </div>
        <span className="font-mono text-[13px] tabular-nums text-muted-foreground">42 / 70</span>
      </div>
    </div>
  );
}

function ReactMock() {
  return (
    <div className="flex w-full items-center justify-around rounded-3xl border border-border bg-[#F7F9F9] py-8">
      {[
        { Icon: MessageCircle, color: "#1D9BF0", label: t("返信") },
        { Icon: Repeat2, color: "#00BA7C", label: t("リポスト") },
        { Icon: Heart, color: "#F91880", label: t("いいね") },
      ].map(({ Icon, color, label }) => (
        <div key={label} className="flex flex-col items-center gap-2">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-background shadow-sm" style={{ color }}>
            <Icon className="h-7 w-7" aria-hidden />
          </span>
          <span className="text-[13px] font-semibold text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

function ProviderMock() {
  return (
    <div className="flex w-full flex-col items-center gap-4 rounded-3xl border border-border bg-[#F7F9F9] py-8">
      <div className="flex items-center gap-4">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-background shadow-sm"><GoogleMark className="h-8 w-8" /></span>
        <span className="text-xl text-muted-foreground">/</span>
        <span className="grid h-16 w-16 place-items-center rounded-full bg-black text-white shadow-sm"><AppleMark className="h-7 w-7" /></span>
      </div>
      <p className="text-[15px] font-semibold text-muted-foreground">{t("パスワードは作りません")}</p>
    </div>
  );
}

const SLIDES: Slide[] = [
  { title: "70字だけ、書こう。", body: "長文はいらない。いまの気持ちを、ひと言で残せます。", visual: <PostMock /> },
  { title: "ゆるく、つながる。", body: "返信・リポスト・いいねで、誰かの一言にそっと反応できます。", visual: <ReactMock /> },
  { title: "ログインは、ワンタップ。", body: "GoogleかAppleのアカウントだけで、すぐ始められます。名前やアイコンはあとから変えられます。", visual: <ProviderMock /> },
];

/** ログイン前に価値を伝える3枚のスライド。最後に onDone でログインへ進める。 */
export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState<number>(0);
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pb-8 pt-4">
      <div className="flex h-11 items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/icon.png" alt="" className="h-7 w-7 rounded-full" />
          <span className="text-lg font-bold">@yytblue</span>
        </div>
        {!last ? (
          <button type="button" onClick={onDone} className="h-11 px-2 text-[15px] font-semibold text-muted-foreground">
            {t("スキップ")}
          </button>
        ) : null}
      </div>

      <div key={index} className="flex flex-1 animate-fade-in flex-col justify-center gap-8">
        {slide.visual}
        <div>
          <h2 className="text-[30px] font-bold leading-tight">{t(slide.title)}</h2>
          <p className="mt-3 text-[17px] leading-relaxed text-muted-foreground">{t(slide.body)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2" aria-hidden>
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${i === index ? "w-6 bg-[hsl(var(--brand))]" : "w-2 bg-border"}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => (last ? onDone() : setIndex(index + 1))}
          className="flex h-[52px] items-center gap-2 rounded-full bg-[hsl(var(--brand))] px-7 text-[17px] font-semibold text-white transition active:scale-[0.97]"
        >
          {last ? t("ログインへ進む") : t("次へ")}
          <ArrowRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
