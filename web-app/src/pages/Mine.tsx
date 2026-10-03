import { t, useLanguage } from "@/lib/language";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/authContext";
import { displayName, userHandle } from "@/hooks/authUser";
import { fetchPosts, insertPost, sortTimeline, thisWeekCount, setPostLike, type Post } from "@/lib/posts";
import { Shell, Row, ComposeSheet, SignInPanel } from "@/pages/IndexShared";
import { useOwnProfile } from "@/hooks/useOwnProfile";

export default function MinePage() {
  useLanguage();
  const { user, signOut } = useAuth();
  const own = useOwnProfile();
  const [posts, setPosts] = useState<Post[]>([]);
  const [open, setOpen] = useState(false);
  const mine = useMemo(() => sortTimeline(posts).filter((post) => post.isMine), [posts]);
  const count = thisWeekCount(posts);

  useEffect(() => {
    let cancelled = false;
    fetchPosts(user?.id).then((next) => { if (!cancelled) setPosts(next); })
      .catch(() => { if (!cancelled) toast.error(t("投稿またはいいねを読み込めませんでした。")); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const activeUser = useRef(user?.id);
  activeUser.current = user?.id;
  async function like(id: string) {
    if (!user) { toast.error(t("いいねするにはAppleかGoogleでログインしてください。")); return; }
    const post = posts.find((item) => item.id === id);
    if (!post) return;
    const userId = user.id;
    try {
      const state = await setPostLike(id, !post.isLiked, userId);
      if (activeUser.current === userId) {
        setPosts((current) => current.map((item) => item.id === id ? { ...item, ...state } : item));
      }
    } catch { toast.error(t("いいねを保存できませんでした。もう一度試してください。")); }
  }

  async function add(body: string) {
    if (!user) return;
    const next = await insertPost(body, user);
    setPosts((current) => [next, ...current]);
  }

  return (
    <>
      <Shell tab="mine" onCompose={() => (user ? setOpen(true) : undefined)}>
        {user ? (
          <>
            <div className="flex items-center justify-between pt-4">
              <Link to={`/profile/${encodeURIComponent(user.id)}`} className="text-base font-semibold text-[hsl(var(--brand))]">{t("プロフィールを見る・編集")}</Link>
              <button type="button" onClick={signOut} className="h-11 text-[hsl(var(--brand))]">
                {t("ログアウト")}</button>
            </div>
            <div className="py-6 text-center">
              <p className="text-[56px] font-bold leading-none tabular-nums">{count}</p>
              <p className="mt-1 text-base text-muted-foreground">{t("今週の投稿")}</p>
            </div>
            {mine.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">{t("まだ投稿がありません")}</p>
            ) : (
              mine.map((post) => <Row key={post.id} post={post} showAuthor={false} onLike={() => like(post.id)} />)
            )}
          </>
        ) : (
          <SignInPanel title={t("自分の投稿")} message={t("ログインすると、この端末を超えて自分の投稿が見られます。")} />
        )}
      </Shell>
      {open && user ? (
        <ComposeSheet
          onClose={() => setOpen(false)}
          onPost={add}
          authorName={own?.name ?? displayName(user)}
          handle={own?.handle ?? userHandle(user)}
          initial={own?.initial ?? displayName(user).slice(0, 1)}
        />
      ) : null}
    </>
  );
}

