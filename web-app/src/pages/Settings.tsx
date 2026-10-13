import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/authContext";
import { deleteAccount, listRelationships, setRelationship } from "@/lib/relationships";
import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronLeft, Plus } from "lucide-react";
import { AppleMark, GoogleMark } from "@/components/BrandMarks";
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
  const { user, signOut, accounts, switchAccount, removeAccount: forgetAccount, signIn, isSigningIn } = useAuth();
  const [switching, setSwitching] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState<boolean>(false);
  async function onSwitch(id: string) {
    setSwitching(id);
    const ok = await switchAccount(id);
    setSwitching(null);
    if (!ok) toast.error(t("アカウントを切り替えられませんでした。もう一度ログインしてください。"));
    else toast.success(t("アカウントを切り替えました"));
  }
  function onAdd(provider: "google" | "apple") {
    sessionStorage.setItem("iruka:auth_return_to", "/settings");
    void signIn(provider);
  }
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<"signout" | "delete" | null>(null);
  const deleteMine = useMutation({
    mutationFn: () => deleteAccount(user?.id ?? ""),
    onSuccess: () => {
      queryClient.clear();
      signOut();
    },
    onError: () => {
      setConfirm(null);
      toast.error(t("アカウントを削除できませんでした。"));
    },
  });
  const enabled = Boolean(user?.id);
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
          <section className="space-y-2 px-4 pt-8">
            <h2 className="text-[13px] font-bold text-muted-foreground">{t("アカウントの切り替え")}</h2>
            <ul className="divide-y divide-border rounded-2xl border border-border">
              {accounts.map((account) => {
                const current = account.id === user?.id;
                const label = account.name?.trim() || account.email || account.id;
                return (
                  <li key={account.id} className="flex items-center gap-3 px-4 py-2">
                    <button
                      type="button"
                      disabled={current || switching !== null}
                      onClick={() => void onSwitch(account.id)}
                      className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left active:opacity-70"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-[15px] font-bold">
                        {account.picture ? <img src={account.picture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : Array.from(label)[0]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-bold">{label}</span>
                        <span className="block truncate text-[13px] text-muted-foreground">{account.email}</span>
                      </span>
                      {current ? <Check className="h-5 w-5 shrink-0 text-[#1D9BF0]" aria-label={t("使用中")} /> : switching === account.id ? <span className="text-[13px] text-muted-foreground">…</span> : null}
                    </button>
                    {!current ? (
                      <button type="button" onClick={() => void forgetAccount(account.id)} className="h-9 shrink-0 rounded-full border border-input px-3 text-[13px] font-bold active:bg-muted">
                        {t("外す")}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {showAdd ? (
              <div className="grid gap-2 pt-1">
                <button type="button" disabled={isSigningIn} onClick={() => onAdd("google")} className="flex h-12 items-center justify-center gap-3 rounded-full border border-input text-[16px] font-semibold active:bg-muted disabled:opacity-50">
                  <GoogleMark className="h-5 w-5" />{t("Googleで続ける")}
                </button>
                <button type="button" disabled={isSigningIn} onClick={() => onAdd("apple")} className="flex h-12 items-center justify-center gap-3 rounded-full bg-black text-[16px] font-semibold text-white disabled:opacity-50">
                  <AppleMark className="h-5 w-5" />{t("Appleで続ける")}
                </button>
                <p className="text-[13px] text-muted-foreground">{t("別のGoogle／Appleアカウントでログインすると、新しいアカウントとして追加されます。")}</p>
              </div>
            ) : (
              <button type="button" onClick={() => setShowAdd(true)} className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-input text-[16px] font-semibold active:bg-muted">
                <Plus className="h-5 w-5" aria-hidden />{t("アカウントを追加")}
              </button>
            )}
          </section>
        ) : null}
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
        {enabled ? (
          <section className="space-y-3 px-4 pb-12">
            <h2 className="text-[13px] font-bold text-muted-foreground">{t("アカウント")}</h2>
            <button type="button" onClick={() => setConfirm("signout")} className="h-12 w-full rounded-full border border-input text-[16px] font-semibold active:bg-muted">
              {t("ログアウト")}
            </button>
            <button type="button" disabled={deleteMine.isPending} onClick={() => setConfirm("delete")} className="h-12 w-full rounded-full border border-red-300 text-[16px] font-semibold text-red-600 active:bg-red-50 disabled:opacity-50">
              {deleteMine.isPending ? t("削除中…") : t("アカウントを削除")}
            </button>
          </section>
        ) : null}
      </div>
      {confirm ? (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/40 px-6" role="alertdialog" aria-modal="true">
          <div className="w-full max-w-[340px] rounded-2xl bg-background p-5">
            <h3 className="text-[17px] font-bold">{t(confirm === "delete" ? "アカウントを削除しますか？" : "ログアウトしますか？")}</h3>
            <p className="mt-2 text-[14px] text-muted-foreground">
              {t(confirm === "delete" ? "投稿、プロフィール、いいね、ブックマーク、通知が削除されます。この操作は取り消せません。" : "この端末からサインアウトします。もう一度ログインできます。")}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setConfirm(null)} className="h-11 rounded-full border border-input font-semibold">{t("キャンセル")}</button>
              <button
                type="button"
                onClick={() => {
                  if (confirm === "delete") deleteMine.mutate();
                  else signOut();
                }}
                className={`h-11 rounded-full font-semibold text-white ${confirm === "delete" ? "bg-red-600" : "bg-foreground text-background"}`}
              >
                {t(confirm === "delete" ? "削除する" : "ログアウト")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
