import { DesktopSidebar } from "@/components/DesktopSidebar";
import { useDesktopNavigation } from "@/hooks/useDesktopNavigation";
import { useBottomBarLabels } from "@/hooks/useBottomBarLabels";
import { Switch } from "@/components/ui/switch";
import { t, useLanguage } from "@/lib/language";
import { likeIconOptions, useLikeIcon, type LikeIcon } from "@/hooks/useLikeIcon";
import { Link, useNavigate } from "react-router-dom";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { themeOptions, useTheme, type Theme } from "@/hooks/useTheme";

export default function SettingsPage() {
  const { showBottomBarLabels, setShowBottomBarLabels } = useBottomBarLabels();
  const navigate = useNavigate();
  const { useDesktopBottomBar, setUseDesktopBottomBar } = useDesktopNavigation();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { likeIcon, setLikeIcon } = useLikeIcon();
  return <div className={`mx-auto min-h-dvh w-full max-w-[430px] bg-background text-foreground ${useDesktopBottomBar ? "" : "lg:max-w-[760px] lg:pl-[220px]"}`}>
    {!useDesktopBottomBar && <DesktopSidebar tab="settings" onCompose={() => navigate("/", { state: { compose: true } })} />}
    <main className="px-5 pb-10">
    <header className="flex min-h-14 items-center gap-5 border-b border-border">
      <Link to="/" className="flex min-h-11 items-center text-[hsl(var(--brand))]">{t("ホーム")}</Link>
      <h1 className="text-lg font-semibold">{t("設定")}</h1>
    </header>
    <section className="py-6">
      <h2 id="theme-label" className="text-xl font-semibold">{t("外観")}</h2>
      <p className="mb-5 mt-2 text-base text-muted-foreground">{t("システムを選ぶと端末の外観設定に合わせて切り替わります。")}</p>
      <RadioGroup aria-labelledby="theme-label" value={theme} onValueChange={(value) => setTheme(value as Theme)}>
        {themeOptions.map((option) => <label key={option.value} htmlFor={`theme-${option.value}`}
          className="flex min-h-14 cursor-pointer items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-base">
          {t(option.label)}<RadioGroupItem id={`theme-${option.value}`} value={option.value} />
        </label>)}
      </RadioGroup>
    </section>
    <section className="border-t border-border py-6">
      <h2 id="desktop-navigation-label" className="mb-5 text-xl font-semibold">{t("ナビゲーション")}</h2>
      <p className="mb-4 text-base text-muted-foreground">{t("デスクトップでは左側サイドバーを使用します。モバイルではボトムバーを使用します。")}</p>
      <RadioGroup aria-labelledby="desktop-navigation-label" value={useDesktopBottomBar ? "bottom" : "sidebar"} onValueChange={(value) => setUseDesktopBottomBar(value === "bottom")} className="mb-5">
        {[{ value: "sidebar", label: "左側サイドバー（デスクトップ）" }, { value: "bottom", label: "ボトムバー（デスクトップ）" }].map((option) => <label key={option.value} htmlFor={`desktop-navigation-${option.value}`}
          className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-base">
          {t(option.label)}<RadioGroupItem id={`desktop-navigation-${option.value}`} value={option.value} />
        </label>)}
      </RadioGroup>
      <div className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
        <label htmlFor="bottom-bar-labels" className="cursor-pointer text-base">{t("ボトムバーの文字を表示")}</label>
        <Switch id="bottom-bar-labels" checked={showBottomBarLabels} onCheckedChange={setShowBottomBarLabels} />
      </div>
    </section>
    <section className="border-t border-border py-6">
      <h2 id="like-icon-label" className="text-xl font-semibold">{t("いいねアイコン")}</h2>
      <p className="mb-5 mt-2 text-base text-muted-foreground">{t("いいねの表示に使うアイコンを選べます。")}</p>
      <RadioGroup aria-labelledby="like-icon-label" value={likeIcon} onValueChange={(value) => setLikeIcon(value as LikeIcon)}>
        {likeIconOptions.map(({ value, label, Icon }) => <label key={value} htmlFor={`like-icon-${value}`}
          className="flex min-h-14 cursor-pointer items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-base">
          <span className="inline-flex items-center gap-3"><Icon className="h-5 w-5" aria-hidden />{t(label)}</span>
          <RadioGroupItem id={`like-icon-${value}`} value={value} />
        </label>)}
      </RadioGroup>
    </section>
    <section className="border-t border-border py-6">
      <h2 id="language-label" className="mb-5 text-xl font-semibold">{t("言語")}</h2>
      <RadioGroup aria-labelledby="language-label" value={language} onValueChange={(value) => setLanguage(value === "en" ? "en" : "ja")}>
        {[{ value: "ja", label: "日本語" }, { value: "en", label: "English" }].map((option) => <label key={option.value} htmlFor={`language-${option.value}`}
          className="flex min-h-14 cursor-pointer items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-base">
          {option.label}<RadioGroupItem id={`language-${option.value}`} value={option.value} />
        </label>)}
      </RadioGroup>
    </section>
    </main>
  </div>;
}
