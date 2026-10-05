import { useQueryClient } from "@tanstack/react-query";
import { t, useLanguage } from "@/lib/language";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/authContext";
import { ensureProfile, fetchHandleAvailability, fetchProfile, saveProfile, uploadAvatar, type Profile } from "@/lib/profiles";

/** プロフィール編集ページ（/profile/edit）。保存すると自分のプロフィールへ戻る。 */
export default function ProfileEditPage() {
  useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [availability, setAvailability] = useState<boolean | null>(null);
  const [checkingHandle, setCheckingHandle] = useState(false);
  const lengthOk = handle.length >= 3 && handle.length <= 25;
  const charsOk = /^[a-z0-9_]*$/.test(handle);
  const formatOk = lengthOk && charsOk;
  const unchanged = handle.length > 0 && handle === (profile?.handle ?? "");
  const userId = user?.id ?? "";

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setProfile(null); setError("");
    async function load() {
      if (!userId) return;
      if (user) await ensureProfile(user);
      const next = await fetchProfile(userId);
      if (cancelled) return;
      setProfile(next);
      if (next) { setName(next.name); setHandle(next.handle ?? ""); setBio(next.bio); setAvatar(next.avatar_url ?? ""); }
    }
    load().catch(() => { if (!cancelled) setError("プロフィールを読み込めませんでした。"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, user, retry]);

  useEffect(() => {
    if (!formatOk) { setAvailability(null); setCheckingHandle(false); return; }
    if (unchanged || !userId) { setAvailability(true); setCheckingHandle(false); return; }
    let cancelled = false;
    setCheckingHandle(true);
    const timer = setTimeout(() => {
      fetchHandleAvailability(handle, userId)
        .then((available) => { if (!cancelled) setAvailability(available); })
        .catch(() => { if (!cancelled) setAvailability(null); })
        .finally(() => { if (!cancelled) setCheckingHandle(false); });
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [formatOk, unchanged, userId, handle]);

  async function pickAvatar(file?: File) {
    if (!file || !user || uploading) return;
    setUploading(true); setError("");
    try {
      const url = await uploadAvatar(file, user.id);
      setAvatar(url); setImageFailed(false);
    } catch (error) { setError(error instanceof Error ? error.message : "画像をアップロードできませんでした。"); }
    finally { setUploading(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user || saving) return;
    setSaving(true); setError("");
    try {
      await saveProfile(user.id, name, handle.toLowerCase(), bio, avatar.trim());
      queryClient.invalidateQueries({ queryKey: ["ownProfile", user.id] });
      navigate(`/profile/${encodeURIComponent(user.id)}`, { replace: true });
    } catch (error) { setError(error instanceof Error ? error.message : "保存できませんでした。"); }
    finally { setSaving(false); }
  }
  const inputClass = "mt-1 w-full rounded-xl border border-input bg-background p-3 text-base";
  return <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-background px-5 pb-10 text-foreground">
    <header className="flex min-h-14 items-center gap-3 border-b border-border">
      <button type="button" onClick={() => navigate(-1)} aria-label={t("戻る")} className="grid min-h-11 min-w-11 place-items-center text-[hsl(var(--brand))]">
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </button>
      <h1 className="text-lg font-semibold">{t("プロフィールを編集")}</h1>
    </header>
    {error ? <p role="alert" className="my-4 text-red-600">{t(error)}</p> : null}
    {loading ? <p role="status" className="py-10 text-muted-foreground">{t("読み込み中…")}</p> : !profile ? <div className="py-10">
      <p>{t("プロフィールが見つかりません。")}</p><button onClick={() => setRetry((value) => value + 1)} className="mt-3 min-h-11 text-[hsl(var(--brand))]">{t("再読み込み")}</button>
    </div> : <form onSubmit={submit} className="grid gap-4 py-5">
      <label>{t("表示名")}<input value={name} onChange={(event) => setName(event.target.value)} required className={inputClass} /><span className="text-sm text-muted-foreground">{t("1〜40文字")}</span></label>
      <label>{t("ユーザー名")}<input value={handle} onChange={(event) => setHandle(event.target.value.toLowerCase())} required autoComplete="off" spellCheck={false}
        className={`mt-1 w-full rounded-xl border bg-background p-3 text-base ${handle && !formatOk ? "border-red-400" : "border-input"}`} />
        <ul className="mt-2 grid gap-1 text-sm" aria-live="polite">
          <HandleRule ok={lengthOk} touched={handle.length > 0} label={t("3〜25文字")} />
          <HandleRule ok={charsOk} touched={handle.length > 0} label={t("小文字の英数字と_")} />
          {formatOk && (checkingHandle || availability !== null) ? <li className={`flex items-center gap-1 ${availability === false ? "text-red-600" : availability === true ? "text-emerald-600" : "text-muted-foreground"}`}>
            {availability === false ? <X className="h-4 w-4" aria-hidden /> : availability === true ? <Check className="h-4 w-4" aria-hidden /> : <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            <span>{availability === false ? t("このユーザー名は既に使われています。") : availability === true ? t("利用できるユーザー名です。") : t("確認中…")}</span>
          </li> : null}
        </ul>
      </label>
      <label>{t("自己紹介")}<textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={4} className={inputClass} /><span className="text-sm text-muted-foreground">{Array.from(bio).length} / 160 {t("文字")}</span></label>
      <div>
        <span className="text-sm font-medium">{t("プロフィール画像")}</span>
        <div className="mt-2 flex items-center gap-4">
          {avatar && !imageFailed ? <img src={avatar} onError={() => setImageFailed(true)} referrerPolicy="no-referrer" alt="" className="h-16 w-16 rounded-full object-cover" /> :
            <span className="grid h-16 w-16 place-items-center rounded-full bg-[#8ECAE6] text-xl font-bold" aria-hidden>{Array.from(name)[0] ?? "?"}</span>}
          <div className="grid gap-1">
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-input px-4 text-base text-[hsl(var(--brand))]">
              {uploading ? t("アップロード中…") : t("画像を変更")}
              <input type="file" accept="image/*" disabled={uploading} className="sr-only"
                onChange={(event) => { void pickAvatar(event.target.files?.[0]); event.target.value = ""; }} />
            </label>
            {avatar ? <button type="button" disabled={uploading} onClick={() => setAvatar("")} className="min-h-11 px-1 text-left text-sm text-muted-foreground">{t("画像を削除")}</button> : null}
          </div>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("JPEGやPNGの画像を登録できます。")}</p>
      </div>
      <div className="flex gap-3"><button type="submit" disabled={saving || !formatOk || availability === false || checkingHandle} className="min-h-11 rounded-full bg-[hsl(var(--brand))] px-6 font-semibold text-white disabled:opacity-50">{saving ? t("保存中…") : t("保存する")}</button>
        <button type="button" disabled={saving} onClick={() => navigate(-1)} className="min-h-11 px-3">{t("キャンセル")}</button></div>
    </form>}
  </div>;
}

function HandleRule({ ok, touched, label }: { ok: boolean; touched: boolean; label: string }) {
  const Icon = ok ? Check : X;
  const color = ok ? "text-emerald-600" : touched ? "text-red-600" : "text-muted-foreground";
  return <li className={`flex items-center gap-1 ${color}`}>
    <Icon className="h-4 w-4" aria-hidden />
    <span>{label}</span>
  </li>;
}
