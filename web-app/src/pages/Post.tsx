import { exportPostPdf } from "@/lib/postPdf";
import { ReplyComposer } from "@/components/ReplyComposer";
import { BookmarkButton } from "@/components/BookmarkButton";
import { t, useLanguage } from "@/lib/language";
import { useDateDisplay } from "@/lib/dateDisplay";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/authContext";
import { fetchPosts, timeLabel, setPostLike, type Post } from "@/lib/posts";
import { Row, LikeButton, Avatar } from "@/pages/IndexShared";

export default function PostPage() {
  useLanguage();
  useDateDisplay();
  const { id } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const post = posts.find((item) => item.id === id);
  const { user } = useAuth();
  useEffect(() => {
    let cancelled = false;
    setReady(false); setLoadError(false); setPosts([]);
    fetchPosts(user?.id)
      .then((next) => { if (!cancelled) setPosts(next); })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [user?.id, id, retry]);
  const activeUser = useRef(user?.id);
  activeUser.current = user?.id;
  async function like() {
    if (!user) { toast.error(t("いいねするにはAppleかGoogleでログインしてください。")); return; }
    if (!id || !post) return;
    const userId = user.id;
    try {
      const state = await setPostLike(id, !post.isLiked, userId);
      if (activeUser.current === userId) {
        setPosts((current) => current.map((item) => item.id === id ? { ...item, ...state } : item));
      }
    } catch { toast.error(t("いいねを保存できませんでした。もう一度試してください。")); }
  }

  if (!ready) {
    return <div className="mx-auto min-h-dvh max-w-[430px] bg-background" />;
  }

  if (loadError) return <div className="mx-auto max-w-[430px] p-5"><p role="alert">{t("投稿またはいいねを読み込めませんでした。")}</p><button type="button" onClick={() => setRetry((value) => value + 1)} className="min-h-11 text-[hsl(var(--brand))]">{t("再読み込み")}</button></div>;

  if (!post) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-background px-5 pt-6">
        <button type="button" onClick={() => navigate(-1)} className="mb-6 h-11 text-left text-[hsl(var(--brand))]">
          {t("戻る")}</button>
        <p className="text-muted-foreground">{t("投稿が見つかりません。")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-background px-5 pb-10 text-foreground">
      <header className="sticky top-0 flex h-14 items-center bg-background/75 backdrop-blur-xl">
        <button type="button" onClick={() => navigate(-1)} className="h-11 pr-4 text-[hsl(var(--brand))]">
          {t("戻る")}</button>
        <span className="text-[17px] font-semibold">{t("投稿")}</span>
      </header>
      <div className="mt-2 flex items-center gap-3">
        {post.userId ? (
          <Link to={`/profile/${encodeURIComponent(post.userId)}`} aria-label={t("プロフィール")} className="shrink-0">
            <Avatar initial={post.initial} index={post.avatarIndex} />
          </Link>
        ) : <Avatar initial={post.initial} index={post.avatarIndex} />}
        <div>
          {post.userId ? <Link to={`/profile/${encodeURIComponent(post.userId)}`} className="text-[17px] font-semibold">{post.authorName}</Link> : <p className="text-[17px] font-semibold">{post.authorName}</p>}
          <p className="text-[15px] text-muted-foreground">{post.handle}</p>
        </div>
      </div>
      {post.parentId && <Link to={`/post/${post.parentId}`} className="inline-flex min-h-11 items-center text-[hsl(var(--brand))]">{t("返信先の投稿")}</Link>}
      <p className="mt-5 text-2xl font-semibold leading-snug">{post.body}</p>
      <div className="mt-3 flex items-center gap-2">
        <LikeButton post={post} onClick={like} /><BookmarkButton postId={post.id} />
        <button type="button" onClick={() => { if (!exportPostPdf(post)) toast.error(t("PDFを開けませんでした。")); }}
          aria-label={t("PDFとして出力")} className="grid min-h-11 min-w-11 place-items-center text-muted-foreground">
          <Download className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <div className="mt-6 grid grid-cols-2 border-t border-border pt-4">
        <div>
          <p className="text-[13px] text-muted-foreground">{t("投稿時刻")}</p>
          <p className="mt-1 text-[17px] font-semibold">{timeLabel(post.createdAt)}</p>
        </div>
        <div className="border-l border-border pl-4">
          <p className="text-[13px] text-muted-foreground">{t("文字数")}</p>
          <p className="mt-1 text-[17px] font-semibold">{post.body.length} {t("文字")}</p>
        </div>
      </div>
      <section className="mt-6 border-t border-border pt-4">
        <h2 className="text-xl font-semibold">{t("返信")}</h2>
        <ReplyComposer key={`${post.id}:${user?.id ?? ""}`} post={post} onReply={(reply) => setPosts((current) => [reply, ...current.filter((item) => item.id !== reply.id)])} />
        {posts.filter((item) => item.parentId === post.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((reply) =>
          <Row key={reply.id} post={reply} showAuthor onLike={async () => {
            if (!user) { toast.error(t("返信するにはログインしてください。")); return; }
            try { const state = await setPostLike(reply.id, !reply.isLiked, user.id);
              if (activeUser.current === user.id) setPosts((current) => current.map((item) => item.id === reply.id ? { ...item, ...state } : item));
            } catch { toast.error(t("いいねを保存できませんでした。もう一度試してください。")); }
          }} />)}
        {!posts.some((item) => item.parentId === post.id) && <p className="py-5 text-muted-foreground">{t("まだ返信がありません。")}</p>}
      </section>
    </div>
  );
}

