import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { t, useLanguage, type Language } from "@/lib/language";
import { useTheme, type ThemeMode } from "@/lib/theme";

function Segment<T extends string>({ value, options, onChange }: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-1 rounded-2xl bg-muted p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`h-11 rounded-xl text-[15px] transition ${value === o.id ? "bg-background font-bold text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  return (
    <div className="min-h-dvh bg-muted text-foreground">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-background">
        <header className="sticky top-0 z-10 grid h-12 grid-cols-[44px_1fr_44px] items-center border-b border-border bg-background px-2">
          <Link to="/" className="grid h-11 w-11 place-items-center" aria-label={t("ホーム")}><ChevronLeft className="h-6 w-6" /></Link>
          <h1 className="text-center text-[17px] font-bold">{t("設定")}</h1>
          <span />
        </header>
        <section className="space-y-2 px-4 pt-6">
          <h2 className="text-[13px] font-bold text-muted-foreground">{t("テーマ")}</h2>
          <Segment<ThemeMode>
            value={theme}
            onChange={setTheme}
            options={[
              { id: "light", label: t("ライト") },
              { id: "dark", label: t("ダーク") },
              { id: "system", label: t("システム") },
            ]}
          />
          <p className="text-[13px] text-muted-foreground">{t("システムを選ぶと端末の外観設定に合わせて切り替わります。")}</p>
        </section>
        <section className="space-y-2 px-4 pt-8">
          <h2 className="text-[13px] font-bold text-muted-foreground">{t("言語")}</h2>
          <Segment<Language>
            value={language}
            onChange={setLanguage}
            options={[
              { id: "ja", label: "日本語" },
              { id: "en", label: "English" },
            ]}
          />
        </section>
      </div>
    </div>
  );
}
