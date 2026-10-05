import { getUserRelationship, setUserRelationship, type RelationshipState } from "@/lib/userRelationships";
import { BookmarkButton } from "@/components/BookmarkButton";
import { t, useLanguage } from "@/lib/language";
import { LikeIconGlyph } from "@/hooks/useLikeIcon";
import { ArrowLeft, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/authContext";
import { ensureProfile, fetchProfile, type Profile } from "@/lib/profiles";
import { fetchPosts, type Post } from "@/lib/posts";
import { ListMembershipPicker } from "@/components/ListMembershipPicker";

export default function ProfilePage() {
  useLanguage();
  const { id } = useParams();
  const { user } = useAuth();
  const activeIdentity = useRef("");
  activeIdentity.current = `${id}:${user?.id ?? ""}`;
  const own = Boolean(user && user.id === id);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [relationship, setRelationship] = useState<RelationshipState>({ is_muted: false, is_blocked: false });
  const [relationshipBusy, setRelationshipBusy] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setProfile(null); setError(""); setRelationship({ is_muted: false, is_blocked: false }); setImageFailed(false);
    async function load() {
      if (!id) return;
      if (user?.id === id) await ensureProfile(user);
      const [next, timeline, relation] = await Promise.all([fetchProfile(id), fetchPosts(user?.id), user && user.id !== id ? getUserRelationship(user.id, id) : Promise.resolve({ is_muted: false, is_blocked: false })]);
      if (cancelled) return;
      setRelationship(relation); setProfile(next); setPosts(timeline.filter((post) => post.userId === id));
    }
    load().catch(() => { if (!cancelled) setError("プロフィールを読み込めませんでした。"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, user, retry]);

  async function changeRelationship(kind: "mute" | "block") {
    if (!user || !id || relationshipBusy) return;
    const identity = activeIdentity.current;
    setRelationshipBusy(true); setError("");
    try {
      const next = await setUserRelationship(user.id, id, kind, !(kind === "mute" ? relationship.is_muted : relationship.is_blocked));
      if (identity !== activeIdentity.current) return;
      setRelationship(next);
      setRetry((value) => value + 1);
    } catch { if (identity !== activeIdentity.current) return; setError("設定を保存できませんでした。"); }
    finally { setRelationshipBusy(false); }
  }
  return <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-background px-5 pb-10 text-foreground">
    <header className="flex min-h-14 items-center justify-between border-b border-border">
      <Link to="/" aria-label={t("ホーム")} className="grid min-h-11 min-w-11 place-items-center text-[hsl(var(--brand))]">
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </Link>
      <h1 className="text-lg font-semibold">{t("プロフィール")}</h1>
      <Link to="/mine" aria-label={t("自分")} className="grid min-h-11 min-w-11 place-items-center text-[hsl(var(--brand))]">
        <UserRound className="h-5 w-5" aria-hidden />
      </Link>
    </header>
    {user && id && !own && <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" disabled={relationshipBusy} onClick={() => void changeRelationship("mute")} className="min-h-11 rounded-full border border-input px-4 disabled:opacity-50">{t(relationship.is_muted ? "ミュートを解除" : "ミュート")}</button>
      <button type="button" disabled={relationshipBusy} onClick={() => void changeRelationship("block")} className="min-h-11 rounded-full border border-input px-4 text-red-600 disabled:opacity-50">{t(relationship.is_blocked ? "ブロックを解除" : "ブロック")}</button>
      <ListMembershipPicker userId={user.id} targetId={id} />
    </div>}
    {error ? <p role="alert" className="my-4 text-red-600">{t(error)}</p> : null}
    {loading ? <p role="status" className="py-10 text-muted-foreground">{t("読み込み中…")}</p> : !profile ? <div className="py-10">
      <p>{t("プロフィールが見つかりません。")}</p><button onClick={() => setRetry((value) => value + 1)} className="mt-3 min-h-11 text-[hsl(var(--brand))]">{t("再読み込み")}</button>
    </div> : <>
      <section className="border-b border-border py-6">
        <div className="flex items-start justify-between gap-4">
          {profile.avatar_url && !imageFailed ? <img src={profile.avatar_url} onError={() => setImageFailed(true)} referrerPolicy="no-referrer" alt="" className="h-20 w-20 rounded-full object-cover" /> :
            <span className="grid h-20 w-20 place-items-center rounded-full bg-[#8ECAE6] text-3xl font-bold" aria-hidden>{profile.name.slice(0, 1)}</span>}
          {own ? <Link to="/profile/edit" className="inline-flex min-h-11 items-center rounded-full border border-input px-4 font-semibold">{t("編集する")}</Link> : null}
        </div>
        <h2 className="mt-4 break-words text-2xl font-bold">{profile.name}</h2>
        {profile.handle ? <p className="mt-1 text-muted-foreground">@{profile.handle}</p> : null}
        {profile.bio ? <p className="mt-4 whitespace-pre-wrap break-words">{profile.bio}</p> : null}
        <p className="mt-4 text-muted-foreground">{profile.post_count} {t("投稿")}</p>
      </section>
      <section className="pt-5"><h2 className="mb-2 text-lg font-semibold">{t("投稿")}</h2>
        {posts.length ? posts.map((post) => <div key={post.id} className="border-b border-border py-2"><Link to={`/post/${post.id}`} className="block py-2"><p className="break-words">{post.body}</p><p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><LikeIconGlyph className="h-4 w-4" liked={Boolean(post.isLiked)} /><span aria-label={t("いいね数")}>{post.likeCount ?? 0}</span></p></Link><BookmarkButton postId={post.id} /></div>) : <p className="py-6 text-muted-foreground">{t("まだ投稿がありません。")}</p>}
      </section>
    </>}
  </div>;
}
