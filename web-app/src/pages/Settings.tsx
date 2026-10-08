import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/authContext";
import { isDevelopmentSession } from "@/lib/development";
import { listRelationships, setRelationship } from "@/lib/relationships";
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = Boolean(user?.id) && !isDevelopmentSession();
  const relations = useQuery({
    queryKey: ["relationships", user?.id],
    queryFn: () => listRelationships(user?.id ?? ""),
    enabled,
  });
  const remove = useMutation({
    mutationFn: (r: { targetId: string; kind: "mute" | "block" }) => setRelationship(r.targetId, r.kind, false, user?.id ?? ""),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["relationships", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["timeline", user?.id] });
    },
  });
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
        {enabled ? (
          <section className="space-y-2 px-4 pb-10 pt-8">
            <h2 className="text-[13px] font-bold text-muted-foreground">{t("ミュート・ブロック中のアカウント")}</h2>
            {(relations.data ?? []).length === 0 ? (
              <p className="text-[14px] text-muted-foreground">{t("まだありません")}</p>
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border">
                {(relations.data ?? []).map((r) => (
                  <li key={`${r.targetId}-${r.kind}`} className="flex items-center gap-3 px-4 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold">{r.name}</p>
                      <p className="truncate text-[13px] text-muted-foreground">
                        {r.handle ? `@${r.handle} · ` : ""}{t(r.kind === "block" ? "ブロック" : "ミュート")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove.mutate({ targetId: r.targetId, kind: r.kind })}
                      className="h-9 rounded-full border border-input px-4 text-[14px] font-bold active:bg-muted"
                    >
                      {t("解除")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
