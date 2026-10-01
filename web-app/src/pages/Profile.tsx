import { BookmarkButton } from "@/components/BookmarkButton";
import { t, useLanguage } from "@/lib/language";
import { LikeIconGlyph } from "@/hooks/useLikeIcon";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ensureProfile, fetchProfile, saveProfile, type Profile } from "@/lib/profiles";
import { fetchPosts, type Post } from "@/lib/posts";

export default function ProfilePage() {
  useLanguage();
  const { id } = useParams();
  const { user } = useAuth();
  const activeIdentity = useRef("");
  activeIdentity.current = `${id}:${user?.id ?? ""}`;
  const own = Boolean(user && user.id === id);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setProfile(null); setError(""); setEditing(false); setImageFailed(false);
    async function load() {
      if (!id) return;
      if (user?.id === id) await ensureProfile(user);
      const [next, timeline] = await Promise.all([fetchProfile(id), fetchPosts(user?.id)]);
      if (cancelled) return;
      setProfile(next); setPosts(timeline.filter((post) => post.userId === id));
    }
    load().catch(() => { if (!cancelled) setError("プロフィールを読み込めませんでした。"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, user?.id, retry]);

  function edit() {
    if (!profile) return;
    setName(profile.name); setHandle(profile.handle ?? "");
    setBio(profile.bio); setAvatar(profile.avatar_url ?? "");
    setError(""); setEditing(true);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user || !own || saving) return;
    const identity = activeIdentity.current;
    setSaving(true); setError("");
    try {
      const next = await saveProfile(user.id, name, handle.toLowerCase(), bio, avatar.trim());
      if (identity !== activeIdentity.current) return;
      setProfile(next); setEditing(false); setImageFailed(false);
    } catch (error) { if (identity === activeIdentity.current) setError(error instanceof Error ? error.message : "保存できませんでした。"); }
    finally { setSaving(false); }
  }
  const inputClass = "mt-1 w-full rounded-xl border border-input bg-background p-3 text-base";
  return <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-background px-5 pb-10 text-foreground">
    <header className="flex min-h-14 items-center justify-between border-b border-border">
      <Link to="/" className="flex min-h-11 items-center text-[hsl(var(--brand))]">{t("ホーム")}</Link>
      <h1 className="text-lg font-semibold">{t("プロフィール")}</h1>
      <Link to="/mine" className="flex min-h-11 items-center text-[hsl(var(--brand))]">{t("自分")}</Link>
    </header>
    <Link to="/settings" className="mt-2 inline-flex min-h-11 items-center text-[hsl(var(--brand))]">{t("設定")}</Link>
    {error ? <p role="alert" className="my-4 text-red-600">{t(error)}</p> : null}
    {loading ? <p role="status" className="py-10 text-muted-foreground">{t("読み込み中…")}</p> : !profile ? <div className="py-10">
      <p>{t("プロフィールが見つかりません。")}</p><button onClick={() => setRetry((value) => value + 1)} className="mt-3 min-h-11 text-[hsl(var(--brand))]">{t("再読み込み")}</button>
    </div> : <>
      <section className="border-b border-border py-6">
        <div className="flex items-start justify-between gap-4">
          {profile.avatar_url && !imageFailed ? <img src={profile.avatar_url} onError={() => setImageFailed(true)} referrerPolicy="no-referrer" alt="" className="h-20 w-20 rounded-full object-cover" /> :
            <span className="grid h-20 w-20 place-items-center rounded-full bg-[#8ECAE6] text-3xl font-bold" aria-hidden>{profile.name.slice(0, 1)}</span>}
          {own && !editing ? <button onClick={edit} className="min-h-11 rounded-full border border-input px-4 font-semibold">{t("編集する")}</button> : null}
        </div>
        <h2 className="mt-4 break-words text-2xl font-bold">{profile.name}</h2>
        {profile.handle ? <p className="mt-1 text-muted-foreground">@{profile.handle}</p> : null}
        {profile.bio ? <p className="mt-4 whitespace-pre-wrap break-words">{profile.bio}</p> : null}
        <p className="mt-4 text-muted-foreground">{profile.post_count} {t("投稿")}</p>
      </section>
      {editing && own ? <form onSubmit={submit} className="grid gap-4 border-b border-border py-5">
        <label>{t("表示名")}<input value={name} onChange={(event) => setName(event.target.value)} required className={inputClass} /><span className="text-sm text-muted-foreground">{t("1〜40文字")}</span></label>
        <label>{t("ユーザー名")}<input value={handle} onChange={(event) => setHandle(event.target.value.toLowerCase())} required pattern="[a-z0-9_]{3,25}" className={inputClass} /><span className="text-sm text-muted-foreground">{t("小文字の英数字と_、3〜25文字")}</span></label>
        <label>{t("自己紹介")}<textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={4} className={inputClass} /><span className="text-sm text-muted-foreground">{Array.from(bio).length} / 160 {t("文字")}</span></label>
        <label>{t("プロフィール画像URL")}<input type="url" value={avatar} onChange={(event) => setAvatar(event.target.value)} placeholder="https://" className={inputClass} /><span className="text-sm text-muted-foreground">{t("HTTPSの画像URL。空欄にすると画像を解除します。")}</span></label>
        <div className="flex gap-3"><button type="submit" disabled={saving} className="min-h-11 rounded-full bg-[hsl(var(--brand))] px-6 font-semibold text-white disabled:opacity-50">{saving ? t("保存中…") : t("保存する")}</button>
          <button type="button" disabled={saving} onClick={() => { setEditing(false); setError(""); }} className="min-h-11 px-3">{t("キャンセル")}</button></div>
      </form> : null}
      <section className="pt-5"><h2 className="mb-2 text-lg font-semibold">{t("投稿")}</h2>
        {posts.length ? posts.map((post) => <div key={post.id} className="border-b border-border py-2"><Link to={`/post/${post.id}`} className="block py-2"><p className="break-words">{post.body}</p><p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><LikeIconGlyph className="h-4 w-4" liked={Boolean(post.isLiked)} /><span aria-label={t("いいね数")}>{post.likeCount ?? 0}</span></p></Link><BookmarkButton postId={post.id} /></div>) : <p className="py-6 text-muted-foreground">{t("まだ投稿がありません。")}</p>}
      </section>
    </>}
  </div>;
}
