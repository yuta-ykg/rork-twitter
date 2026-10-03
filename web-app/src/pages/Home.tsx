import { t, useLanguage } from "@/lib/language";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/authContext";
import { displayName, userHandle } from "@/hooks/authUser";
import { avatarFills, fetchPosts, insertPost, sortTimeline, setPostLike, type Post } from "@/lib/posts";
import { Shell, Row, ComposeSheet, SignInPanel } from "@/pages/IndexShared";
import { useOwnProfile } from "@/hooks/useOwnProfile";

export default function HomePage() {
  useLanguage();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [open, setOpen] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const own = useOwnProfile();
  const [error, setError] = useState("");
  const timeline = useMemo(() => sortTimeline(posts), [posts]);

  useEffect(() => {
    let cancelled = false;
    fetchPosts(user?.id).then((next) => { if (!cancelled) setPosts(next); })
      .catch(() => { if (!cancelled) setError("タイムラインを読み込めませんでした。"); });
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
    try {
      const next = await insertPost(body, user);
      setPosts((current) => [next, ...current]);
      setError("");
    } catch {
      setError("投稿できませんでした。もう一度試してください。");
    }
  }

  return (
    <>
      <Shell tab="home" onCompose={() => (user ? setOpen(true) : setNeedsSignIn(true))}>
        {user ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-input px-4 py-3 text-left transition active:scale-[0.99]"
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-[rgba(15,20,25,0.7)]"
              style={{ backgroundColor: avatarFills[0] }}
              aria-hidden
            >
              {own?.initial ?? displayName(user).slice(0, 1)}
            </span>
            <span className="text-base text-muted-foreground">{t("いまどうしてる？")}</span>
          </button>
        ) : null}
        {error ? <p className="mb-2 text-sm text-red-500">{error}</p> : null}
        {needsSignIn && !user ? (
          <SignInPanel title={t("ログインしてはじめる")} message={t("投稿するには、GoogleかAppleで入ってください。")} />
        ) : null}
        {timeline.map((post) => (
          <Row key={post.id} post={post} showAuthor onLike={() => like(post.id)} />
        ))}
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
