import { useBookmarks } from "@/hooks/useBookmarks";
import { t, useLanguage } from "@/lib/language";
import { isDevelopmentSession, isGuestSession } from "@/lib/development";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/authContext";
import { fetchPosts, setPostLike, type Post } from "@/lib/posts";
import { Shell, Row, SignInPanel } from "@/pages/IndexShared";

export default function BookmarksPage() {
  useLanguage();
  const { user } = useAuth();
  const { ids, loading: bookmarksLoading, error: bookmarkError, refresh: refreshBookmarks } = useBookmarks(user?.id);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const activeUser = useRef(user?.id);
  activeUser.current = user?.id;

  useEffect(() => {
    let cancelled = false;
    setPosts([]); setError(""); setLoading(true);
    if (!user?.id) { setLoading(false); return; }
    fetchPosts(user.id)
      .then((next) => { if (!cancelled) setPosts(next); })
      .catch(() => { if (!cancelled) setError("ブックマークを読み込めませんでした。"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id, retry]);

  const byId = new Map(posts.map((post) => [post.id, post]));
  const savedPosts = ids.flatMap((id) => { const post = byId.get(id); return post ? [post] : []; });
  async function like(post: Post) {
    if (!user) return;
    const userId = user.id;
    try {
      const state = await setPostLike(post.id, !post.isLiked, userId);
      if (activeUser.current === userId) setPosts((current) => current.map((item) => item.id === post.id ? { ...item, ...state } : item));
    } catch { toast.error(t("いいねを保存できませんでした。もう一度試してください。")); }
  }
  return <>
    <Shell tab="bookmarks">
      <h1 className="pt-4 text-[28px] font-bold">{t("ブックマーク")}</h1>
      <p className="mb-4 mt-2 text-base text-muted-foreground">{t(isDevelopmentSession() ? (isGuestSession() ? "ゲストモードのブックマークはこの端末に保存されます。" : "開発モードのブックマークはこの端末に保存されます。") : "ブックマークはアカウントに保存され、端末間で共有されます。")}</p>
      {!user ? <SignInPanel title={t("ブックマーク")} message={t("ブックマークするにはログインしてください。")} /> :
        loading || bookmarksLoading ? <p role="status" className="py-10 text-muted-foreground">{t("読み込み中…")}</p> :
        error || bookmarkError ? <div className="py-6"><p role="alert">{t(error || bookmarkError)}</p><button type="button" onClick={() => { setRetry((value) => value + 1); void refreshBookmarks().catch(() => {}); }} className="min-h-11 text-[hsl(var(--brand))]">{t("再読み込み")}</button></div> :
        savedPosts.length ? savedPosts.map((post) => <Row key={post.id} post={post} showAuthor onLike={() => like(post)} />) :
        <p className="py-10 text-center text-muted-foreground">{t("まだブックマークがありません。")}</p>}
    </Shell>
  </>;
}
