import { likeIconOptions, useLikeIcon, type LikeIcon } from "@/hooks/useLikeIcon";
import { Link } from "react-router-dom";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { themeOptions, useTheme, type Theme } from "@/hooks/useTheme";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { likeIcon, setLikeIcon } = useLikeIcon();
  return <main className="mx-auto min-h-dvh w-full max-w-[430px] bg-background px-5 pb-10 text-foreground">
    <header className="flex min-h-14 items-center gap-5 border-b border-border">
      <Link to="/" className="flex min-h-11 items-center text-[#1D9BF0]">ホーム</Link>
      <h1 className="text-lg font-semibold">設定</h1>
    </header>
    <section className="py-6">
      <h2 id="theme-label" className="text-xl font-semibold">外観</h2>
      <p className="mb-5 mt-2 text-base text-muted-foreground">システムを選ぶと端末の外観設定に合わせて切り替わります。</p>
      <RadioGroup aria-labelledby="theme-label" value={theme} onValueChange={(value) => setTheme(value as Theme)}>
        {themeOptions.map((option) => <label key={option.value} htmlFor={`theme-${option.value}`}
          className="flex min-h-14 cursor-pointer items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-base">
          {option.label}<RadioGroupItem id={`theme-${option.value}`} value={option.value} />
        </label>)}
      </RadioGroup>
    </section>
    <section className="border-t border-border py-6">
      <h2 id="like-icon-label" className="text-xl font-semibold">いいねアイコン</h2>
      <p className="mb-5 mt-2 text-base text-muted-foreground">いいねの表示に使うアイコンを選べます。</p>
      <RadioGroup aria-labelledby="like-icon-label" value={likeIcon} onValueChange={(value) => setLikeIcon(value as LikeIcon)}>
        {likeIconOptions.map(({ value, label, Icon }) => <label key={value} htmlFor={`like-icon-${value}`}
          className="flex min-h-14 cursor-pointer items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-base">
          <span className="inline-flex items-center gap-3"><Icon className="h-5 w-5" aria-hidden />{label}</span>
          <RadioGroupItem id={`like-icon-${value}`} value={value} />
        </label>)}
      </RadioGroup>
    </section>
  </main>;
}
