import { QuoteCard } from "@/components/TweetFeed";
import { useOwnProfile } from "@/hooks/useOwnProfile";
import { fetchProfile } from "@/lib/profiles";
import { userHandle } from "@/hooks/authUser";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/authContext";
import { deleteAccount, listRelationships, setRelationship } from "@/lib/relationships";
import { useEffect, useState } from "react";
import { createSubAccount, deleteSubAccount, isHandleAvailable, MAX_SUB_ACCOUNTS, type SubAccount } from "@/lib/subAccounts";
import { toast } from "sonner";
import { Check, ChevronLeft, Plus } from "lucide-react";
import { AppleMark, GoogleMark } from "@/components/BrandMarks";
import { t, useLanguage, type Language } from "@/lib/language";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { useTextSize, type TextSize } from "@/lib/textSize";
import { useSpeechSpeed, type SpeechSpeed } from "@/lib/speechSpeed";

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
  const { textSize, setTextSize } = useTextSize();
  const { speechSpeed, setSpeechSpeed } = useSpeechSpeed();
  const { user, owner, signOut, accounts, switchAccount, removeAccount: forgetAccount, signIn, isSigningIn, subAccounts, switchPersona, reloadSubAccounts } = useAuth();
  const onSub = Boolean(owner && user && owner.id !== user.id);
  const ownProfile = useOwnProfile();
  const ownerProfile = useQuery({
    queryKey: ["ownProfile", owner?.id],
    queryFn: () => fetchProfile(owner!.id),
    enabled: !!owner?.id,
  });
  const ownerHandle = ownerProfile.data?.handle ? `@${ownerProfile.data.handle}` : owner ? userHandle(owner) : "";
  const [showCreate, setShowCreate] = useState<boolean>(false);
  const [subName, setSubName] = useState<string>("");
  const [subHandle, setSubHandle] = useState<string>("");
  const [subDelete, setSubDelete] = useState<SubAccount | null>(null);
  useEffect(() => {
    void reloadSubAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const createSub = useMutation({
    mutationFn: () => createSubAccount(subName.trim(), subHandle.trim().toLowerCase()),
    onSuccess: async (sub) => {
      await reloadSubAccounts();
      setShowCreate(false);
      setSubName("");
      setSubHandle("");
      switchPersona(sub);
      toast.success(t("サブアカウントを作成しました"));
    },
    onError: (err: unknown) => {
      const code = (err as { code?: string } | null)?.code;
      if (code === "23505") toast.error(t("このIDはすでに使われています。"));
      else if (code === "P0001") toast.error(t("サブアカウントは最大5つまでです。"));
      else toast.error(t("サブアカウントを作成できませんでした。"));
    },
  });
  const removeSub = useMutation({
    mutationFn: (sub: SubAccount) => deleteSubAccount(sub.id),
    onSuccess: async (_data, sub) => {
      if (user?.id === sub.id) switchPersona(null);
      setSubDelete(null);
      await reloadSubAccounts();
      toast.success(t("サブアカウントを削除しました"));
    },
    onError: () => {
      setSubDelete(null);
      toast.error(t("サブアカウントを削除できませんでした。"));
    },
  });
  const handleValid = /^[a-z0-9_]{3,25}$/.test(subHandle.trim().toLowerCase());
  const [debouncedHandle, setDebouncedHandle] = useState<string>("");
  useEffect(() => {
    const value = handleValid ? subHandle.trim().toLowerCase() : "";
    const timer = window.setTimeout(() => setDebouncedHandle(value), 350);
    return () => window.clearTimeout(timer);
  }, [subHandle, handleValid]);
  const availability = useQuery<boolean>({
    queryKey: ["handle-available", debouncedHandle],
    queryFn: () => isHandleAvailable(debouncedHandle),
    enabled: debouncedHandle !== "",
    staleTime: 10_000,
  });
  const currentHandle = subHandle.trim().toLowerCase();
  const handleTaken = handleValid && debouncedHandle === currentHandle && availability.data === false;
  const handleChecking = handleValid && (debouncedHandle !== currentHandle || availability.isFetching);
  function personaRow(id: string, label: string, sub: string, picture: string | undefined, current: boolean, onPick: () => void, onDelete?: () => void) {
    return (
      <li key={id} className="flex items-center gap-3 px-4 py-2">
        <button type="button" disabled={current} onClick={onPick} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left active:opacity-70">
          <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-[15px] font-bold">
            {picture ? <img src={picture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : Array.from(label)[0]}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-bold">{label}</span>
            <span className="block truncate text-[13px] text-muted-foreground">{sub}</span>
          </span>
          {current ? <Check className="h-5 w-5 shrink-0 text-[#1D9BF0]" aria-label={t("使用中")} /> : null}
        </button>
        {onDelete ? (
          <button type="button" onClick={onDelete} className="h-9 shrink-0 rounded-full border border-input px-3 text-[13px] font-bold active:bg-muted">
            {t("削除")}
          </button>
        ) : null}
      </li>
    );
  }
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
    mutationFn: async () => {
      for (const sub of subAccounts) await deleteSubAccount(sub.id);
      switchPersona(null);
      await deleteAccount(owner?.id ?? "");
    },
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
        <Link to="/plans" className="mx-4 mt-6 flex min-h-11 items-center justify-between rounded-xl border border-border px-4 py-3 font-bold text-[#1D9BF0]">{t("プラン・購入")}<span aria-hidden>→</span></Link>
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
        </section>
        <section className="space-y-2 px-4 pt-8" aria-label={t("文字サイズ")}>
          <h2 className="text-[13px] font-bold text-muted-foreground">{t("文字サイズ")}</h2>
          <Segment<TextSize> value={textSize} onChange={setTextSize} options={[
            { id: "standard", label: t("標準") },
            { id: "large", label: t("大") },
            { id: "extra-large", label: t("特大") },
          ]} />
          <div aria-live="polite">
            <QuoteCard post={{
              id: "text-size-preview",
              authorName: ownProfile?.name ?? t("投稿"),
              handle: ownProfile?.handle ?? "@iruka",
              initial: ownProfile?.initial ?? "い",
              avatarUrl: ownProfile?.avatar,
              avatarIndex: 0,
              body: t("今の気持ちを投稿しましょう。"),
              createdAt: "",
              isMine: true,
            }} />
          </div>
        </section>
        <section className="space-y-2 px-4 pt-8">
          <h2 className="text-[13px] font-bold text-muted-foreground" id="speech-speed-label">{t("読み上げ速度")}</h2>
          <div aria-labelledby="speech-speed-label">
            <Segment<SpeechSpeed> value={speechSpeed} onChange={setSpeechSpeed} options={[
              { id: "slow", label: t("遅い") },
              { id: "standard", label: t("標準") },
              { id: "fast", label: t("速い") },
            ]} />
          </div>
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
        {enabled && owner ? (
          <section className="space-y-2 px-4 pt-8">
            <h2 className="text-[13px] font-bold text-muted-foreground">{t("サブアカウント")}</h2>
            <ul className="divide-y divide-border rounded-2xl border border-border">
              {personaRow(owner.id, owner.name?.trim() || owner.email, ownerHandle, owner.picture, !onSub, () => switchPersona(null))}
              {subAccounts.map((sub) =>
                personaRow(sub.id, sub.name, sub.handle ? `@${sub.handle}` : "", sub.avatarUrl ?? undefined, user?.id === sub.id, () => switchPersona(sub), () => setSubDelete(sub)),
              )}
            </ul>
            {showCreate ? (
              <form
                className="grid gap-2 pt-1"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (subName.trim() && handleValid && !handleTaken && !handleChecking) createSub.mutate();
                }}
              >
                <input value={subName} onChange={(event) => setSubName(event.target.value)} maxLength={40} placeholder={t("名前")} aria-label={t("名前")} className="h-12 rounded-xl border border-input bg-background px-4 text-[16px] outline-none focus:border-[#1D9BF0]" />
                <input value={subHandle} onChange={(event) => setSubHandle(event.target.value)} maxLength={25} placeholder={t("ユーザーID（英数字と_、3〜25字）")} aria-label={t("ユーザーID")} aria-invalid={handleTaken} autoCapitalize="none" className={`h-12 rounded-xl border border-input bg-background px-4 text-[16px] outline-none ${handleTaken ? "!border-red-500" : "focus:border-[#1D9BF0]"}`} />
                {handleTaken && <p role="alert" className="-mt-1 px-1 text-[13px] text-red-500">{t("このIDはすでに使われています。")}</p>}
                {handleValid && !handleTaken && !handleChecking && availability.data === true && <p role="status" className="-mt-1 px-1 text-[13px] text-green-600">{t("このIDは使えます。")}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="h-11 rounded-full border border-input font-semibold">{t("キャンセル")}</button>
                  <button type="submit" disabled={!subName.trim() || !handleValid || handleTaken || handleChecking || createSub.isPending} className="h-11 rounded-full bg-foreground font-semibold text-background disabled:opacity-40">
                    {createSub.isPending ? t("作成中…") : t("作成")}
                  </button>
                </div>
              </form>
            ) : subAccounts.length < MAX_SUB_ACCOUNTS ? (
              <button type="button" onClick={() => setShowCreate(true)} className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-input text-[16px] font-semibold active:bg-muted">
                <Plus className="h-5 w-5" aria-hidden />{t("サブアカウントを作成")}
              </button>
            ) : (
              <p className="text-[13px] text-muted-foreground">{t("サブアカウントは最大5つまでです。")}</p>
            )}
          </section>
        ) : null}
        {enabled ? (
          <section className="space-y-2 px-4 pt-8">
            <h2 className="text-[13px] font-bold text-muted-foreground">{t("アカウントの切り替え")}</h2>
            <ul className="divide-y divide-border rounded-2xl border border-border">
              {accounts.map((account) => {
                const current = account.id === owner?.id;
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
        <section className="space-y-3 px-4 pb-6">
          <h2 className="text-[13px] font-bold text-muted-foreground">{t("規約")}</h2>
          <Link to="/commerce" className="flex min-h-12 items-center rounded-full border border-input px-5 text-[16px] font-semibold active:bg-muted">{t("特定商取引法に基づく表記")}</Link>
          <Link to="/terms" className="flex h-12 items-center justify-between rounded-full border border-input px-5 text-[16px] font-semibold active:bg-muted">
            {t("利用規約")}
          </Link>
          <Link to="/privacy" className="flex h-12 items-center justify-between rounded-full border border-input px-5 text-[16px] font-semibold active:bg-muted">
            {t("プライバシーポリシー")}
          </Link>
        </section>
        {enabled ? (
          <section className="space-y-3 px-4 pb-12">
            <h2 className="text-[13px] font-bold text-muted-foreground">{t("アカウント")}</h2>
            <button type="button" onClick={() => setConfirm("signout")} className="h-12 w-full rounded-full border border-input text-[16px] font-semibold active:bg-muted">
              {t("ログアウト")}
            </button>
            {onSub ? null : <button type="button" disabled={deleteMine.isPending} onClick={() => setConfirm("delete")} className="h-12 w-full rounded-full border border-red-300 text-[16px] font-semibold text-red-600 active:bg-red-50 disabled:opacity-50">
              {deleteMine.isPending ? t("削除中…") : t("アカウントを削除")}
            </button>}
          </section>
        ) : null}
      </div>
      {subDelete ? (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/40 px-6" role="alertdialog" aria-modal="true">
          <div className="w-full max-w-[340px] rounded-2xl bg-background p-5">
            <h3 className="text-[17px] font-bold">{t("サブアカウントを削除しますか？")}</h3>
            <p className="mt-2 text-[14px] text-muted-foreground">{t("このサブアカウントの投稿、プロフィール、いいね、ブックマーク、通知が削除されます。この操作は取り消せません。")}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setSubDelete(null)} className="h-11 rounded-full border border-input font-semibold">{t("キャンセル")}</button>
              <button type="button" disabled={removeSub.isPending} onClick={() => removeSub.mutate(subDelete)} className="h-11 rounded-full bg-red-600 font-semibold text-white disabled:opacity-50">{t("削除する")}</button>
            </div>
          </div>
        </div>
      ) : null}
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
