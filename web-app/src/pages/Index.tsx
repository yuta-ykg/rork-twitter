import { LikeIconGlyph, useLikeIcon } from "@/hooks/useLikeIcon";
import { isDevelopmentSession } from "@/lib/development";
import { toast } from "sonner";
import { Fish, House, SquarePen, Settings, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { displayName, useAuth, userHandle } from "@/hooks/useAuth";
import {
  MAX_CHARACTERS,
  avatarFills,
  fetchPosts,
  insertPost,
  sortTimeline,
  thisWeekCount,
  timeLabel,
  setPostLike,
  type Post,
} from "@/lib/posts";

type Tab = "home" | "mine";

function Avatar({ initial, index }: { initial: string; index: number }) {
  return (
    <span
      className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full text-base font-semibold text-[rgba(15,20,25,0.7)]"
      style={{ backgroundColor: avatarFills[index % avatarFills.length] }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

function Wordmark() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xl font-bold text-foreground">
      <Fish className="h-[18px] w-[18px] text-[hsl(var(--brand))]" aria-hidden />
      イルカ
    </span>
  );
}

function PostButton({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-[52px] w-full rounded-full bg-[hsl(var(--brand))] text-[17px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function SignInPanel({ title, message }: { title: string; message: string }) {
  const { isSigningIn, error, signIn, clearError, canSkipLogin, skipLogin } = useAuth();
  return (
    <div className="py-6">
      <h2 className="text-[28px] font-bold leading-tight">{title}</h2>
      <p className="mt-2 text-base text-muted-foreground">{message}</p>
      {error ? (
        <p className="mt-3 text-sm text-red-500">
          {error}{" "}
          <button type="button" onClick={clearError} className="underline">
            閉じる
          </button>
        </p>
      ) : null}
      <div className="mt-5 grid gap-3">
        <PostButton label={isSigningIn ? "ログイン中…" : "Googleで続ける"} disabled={isSigningIn} onClick={() => void signIn("google")} />
        <button
          type="button"
          disabled={isSigningIn}
          onClick={() => void signIn("apple")}
          className="h-[52px] w-full rounded-full bg-black text-[17px] font-semibold text-white disabled:opacity-40"
        >
          Appleで続ける
        </button>
        {canSkipLogin ? <button type="button" disabled={isSigningIn} onClick={skipLogin}
          className="min-h-11 rounded-full border border-input px-4 text-base text-muted-foreground">開発用にログインをスキップ</button> : null}
      </div>
    </div>
  );
}

function ComposeSheet({
  onClose,
  onPost,
  authorName,
  handle,
  initial,
}: {
  onClose: () => void;
  onPost: (body: string) => void;
  authorName: string;
  handle: string;
  initial: string;
}) {
  const [draft, setDraft] = useState("");
  const count = draft.length;
  const canPost = draft.trim().length > 0 && count <= MAX_CHARACTERS;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 sm:items-center" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compose-title"
        className="flex max-h-[92dvh] w-full max-w-[430px] flex-col rounded-t-[28px] bg-background px-5 pb-6 pt-3 shadow-2xl sm:rounded-[28px]"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#ECF0F2]" />
        <div className="mb-4 flex items-center justify-between">
          <h2 id="compose-title" className="text-[17px] font-semibold text-foreground">
            新しい投稿
          </h2>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center text-muted-foreground" aria-label="閉じる">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-4 flex items-center gap-3">
          <Avatar initial={initial} index={0} />
          <div>
            <p className="text-base font-semibold text-foreground">{authorName}</p>
            <p className="text-sm text-muted-foreground">{handle}</p>
          </div>
        </div>
        <div className="relative min-h-[220px] rounded-2xl bg-muted">
          {draft.length === 0 ? (
            <p className="pointer-events-none absolute left-3.5 top-4 text-[17px] text-muted-foreground">今の気持ちを、70字まで。</p>
          ) : null}
          <textarea
            autoFocus
            value={draft}
            maxLength={MAX_CHARACTERS}
            onChange={(event) => setDraft(event.target.value.slice(0, MAX_CHARACTERS))}
            className="h-[220px] w-full resize-none bg-transparent p-3.5 text-[17px] text-foreground outline-none"
            aria-label="投稿本文"
          />
        </div>
        <p className={`mt-3 text-right font-mono text-[15px] ${count >= MAX_CHARACTERS ? "text-red-500" : "text-muted-foreground"}`}>
          {count} / {MAX_CHARACTERS}
        </p>
        <div className="mt-4">
          <PostButton
            label="投稿する"
            disabled={!canPost}
            onClick={() => {
              if (!canPost) return;
              onPost(draft);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}

function Shell({
  tab,
  children,
  onCompose,
}: {
  tab: Tab;
  children: ReactNode;
  onCompose: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  function compose() {
    if (!user) { navigate("/mine"); return; }
    onCompose();
  }
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/80 bg-background/75 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <Wordmark />
          <Link to="/settings" aria-label="設定" className="grid min-h-11 min-w-11 place-items-center text-muted-foreground">
            <Settings className="h-5 w-5" aria-hidden />
          </Link>
        </div>
        {isDevelopmentSession() ? <p className="mt-1 text-sm text-muted-foreground">開発モード・このブラウザに保存</p> : null}
      </header>
      <main className="flex-1 px-5 pb-24">{children}</main>
      <div className="fixed bottom-0 left-1/2 z-20 w-full max-w-[430px] -translate-x-1/2">
        <nav aria-label="メインナビゲーション" className="grid grid-cols-3 border-t border-border/60 bg-background/70 px-6 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
          <Link to="/" className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs ${tab === "home" ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <House className="h-5 w-5" />
            ホーム
          </Link>
          <button type="button" onClick={compose} aria-label="投稿を作成"
            className="flex min-h-11 flex-col items-center justify-center gap-0.5 text-sm text-[hsl(var(--brand))]">
            <SquarePen className="h-5 w-5" aria-hidden />
            投稿
          </button>
          <Link to="/mine" className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs ${tab === "mine" ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <UserRound className="h-5 w-5" />
            自分
          </Link>
        </nav>
      </div>
    </div>
  );
}

function Row({ post, showAuthor, onLike }: { post: Post; showAuthor: boolean; onLike: () => void | Promise<void> }) {
  return (
    <div className="border-b border-border py-3">
    <Link to={`/post/${post.id}`} className="flex gap-3">
      <Avatar initial={post.initial} index={post.avatarIndex} />
      <span className="min-w-0 pt-0.5">
        {showAuthor ? <span className="block text-base font-semibold">{post.authorName}</span> : null}
        <span className="block text-base leading-snug">{post.body}</span>
      </span>
    </Link>
    {post.userId ? <Link to={`/profile/${encodeURIComponent(post.userId)}`} className="ml-[58px] inline-flex min-h-11 items-center text-sm text-[hsl(var(--brand))]">プロフィール</Link> : null}
    <div className="ml-[58px]"><LikeButton post={post} onClick={onLike} /></div>
    </div>
  );
}

function LikeButton({ post, onClick }: { post: Post; onClick: () => void | Promise<void> }) {
  const [pending, setPending] = useState(false);
  const { likeIcon } = useLikeIcon();
  return <button type="button" disabled={pending} aria-busy={pending} onClick={async () => {
    if (pending) return;
    setPending(true);
    try { await onClick(); } finally { setPending(false); }
  }} aria-pressed={Boolean(post.isLiked)}
    aria-label={post.isLiked ? "いいねを取り消す" : "いいね"}
    className={`inline-flex min-h-11 min-w-11 items-center gap-2 rounded-full px-2 transition ${post.isLiked ? (likeIcon === "star" ? "text-amber-500" : "text-pink-500") : "text-muted-foreground"} hover:bg-muted`}>
    <LikeIconGlyph className="h-5 w-5" liked={Boolean(post.isLiked)} />
    <span>{post.likeCount ?? 0}</span>
  </button>;
}

export function HomePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [open, setOpen] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
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
    if (!user) { toast.error("いいねするにはAppleかGoogleでログインしてください。"); return; }
    const post = posts.find((item) => item.id === id);
    if (!post) return;
    const userId = user.id;
    try {
      const state = await setPostLike(id, !post.isLiked, userId);
      if (activeUser.current === userId) {
        setPosts((current) => current.map((item) => item.id === id ? { ...item, ...state } : item));
      }
    } catch { toast.error("いいねを保存できませんでした。もう一度試してください。"); }
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
        <h1 className="pt-4 text-[28px] font-bold leading-tight">いま、みんなが書いている</h1>
        <p className="mb-2 mt-1 text-base text-muted-foreground">70字までの短い投稿</p>
        {error ? <p className="mb-2 text-sm text-red-500">{error}</p> : null}
        {needsSignIn && !user ? (
          <SignInPanel title="ログインしてはじめる" message="投稿するには、GoogleかAppleで入ってください。" />
        ) : null}
        {timeline.map((post) => (
          <Row key={post.id} post={post} showAuthor onLike={() => like(post.id)} />
        ))}
      </Shell>
      {open && user ? (
        <ComposeSheet
          onClose={() => setOpen(false)}
          onPost={add}
          authorName={displayName(user)}
          handle={userHandle(user)}
          initial={displayName(user).slice(0, 1)}
        />
      ) : null}
    </>
  );
}

export function MinePage() {
  const { user, signOut } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [open, setOpen] = useState(false);
  const mine = useMemo(() => sortTimeline(posts).filter((post) => post.isMine), [posts]);
  const count = thisWeekCount(posts);

  useEffect(() => {
    let cancelled = false;
    fetchPosts(user?.id).then((next) => { if (!cancelled) setPosts(next); })
      .catch(() => { if (!cancelled) toast.error("投稿またはいいねを読み込めませんでした。"); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const activeUser = useRef(user?.id);
  activeUser.current = user?.id;
  async function like(id: string) {
    if (!user) { toast.error("いいねするにはAppleかGoogleでログインしてください。"); return; }
    const post = posts.find((item) => item.id === id);
    if (!post) return;
    const userId = user.id;
    try {
      const state = await setPostLike(id, !post.isLiked, userId);
      if (activeUser.current === userId) {
        setPosts((current) => current.map((item) => item.id === id ? { ...item, ...state } : item));
      }
    } catch { toast.error("いいねを保存できませんでした。もう一度試してください。"); }
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
              <Link to={`/profile/${encodeURIComponent(user.id)}`} className="text-base font-semibold text-[hsl(var(--brand))]">プロフィールを見る・編集</Link>
              <button type="button" onClick={signOut} className="h-11 text-[hsl(var(--brand))]">
                ログアウト
              </button>
            </div>
            <div className="py-6 text-center">
              <p className="text-[56px] font-bold leading-none tabular-nums">{count}</p>
              <p className="mt-1 text-base text-muted-foreground">今週の投稿</p>
            </div>
            {mine.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">まだ投稿がありません</p>
            ) : (
              mine.map((post) => <Row key={post.id} post={post} showAuthor={false} onLike={() => like(post.id)} />)
            )}
          </>
        ) : (
          <SignInPanel title="自分の投稿" message="ログインすると、この端末を超えて自分の投稿が見られます。" />
        )}
      </Shell>
      {open && user ? (
        <ComposeSheet
          onClose={() => setOpen(false)}
          onPost={add}
          authorName={displayName(user)}
          handle={userHandle(user)}
          initial={displayName(user).slice(0, 1)}
        />
      ) : null}
    </>
  );
}

export function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [ready, setReady] = useState(false);
  const post = posts.find((item) => item.id === id);
  const { user } = useAuth();
  useEffect(() => {
    let cancelled = false;
    fetchPosts(user?.id)
      .then((next) => { if (!cancelled) setPosts(next); })
      .catch(() => { if (!cancelled) toast.error("投稿またはいいねを読み込めませんでした。"); })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [user?.id]);
  const activeUser = useRef(user?.id);
  activeUser.current = user?.id;
  async function like() {
    if (!user) { toast.error("いいねするにはAppleかGoogleでログインしてください。"); return; }
    if (!id || !post) return;
    const userId = user.id;
    try {
      const state = await setPostLike(id, !post.isLiked, userId);
      if (activeUser.current === userId) {
        setPosts((current) => current.map((item) => item.id === id ? { ...item, ...state } : item));
      }
    } catch { toast.error("いいねを保存できませんでした。もう一度試してください。"); }
  }

  if (!ready) {
    return <div className="mx-auto min-h-dvh max-w-[430px] bg-background" />;
  }

  if (!post) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-background px-5 pt-6">
        <button type="button" onClick={() => navigate(-1)} className="mb-6 h-11 text-left text-[hsl(var(--brand))]">
          戻る
        </button>
        <p className="text-muted-foreground">投稿が見つかりません。</p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-background px-5 pb-10 text-foreground">
      <header className="sticky top-0 flex h-14 items-center bg-background/75 backdrop-blur-xl">
        <button type="button" onClick={() => navigate(-1)} className="h-11 pr-4 text-[hsl(var(--brand))]">
          戻る
        </button>
        <span className="text-[17px] font-semibold">投稿</span>
      </header>
      <div className="mt-2 flex items-center gap-3">
        <Avatar initial={post.initial} index={post.avatarIndex} />
        <div>
          {post.userId ? <Link to={`/profile/${encodeURIComponent(post.userId)}`} className="text-[17px] font-semibold text-[hsl(var(--brand))]">{post.authorName}</Link> : <p className="text-[17px] font-semibold">{post.authorName}</p>}
          <p className="text-[15px] text-muted-foreground">{post.handle}</p>
        </div>
      </div>
      <p className="mt-5 text-2xl font-semibold leading-snug">{post.body}</p>
      <div className="mt-3"><LikeButton post={post} onClick={like} /></div>
      <div className="mt-6 grid grid-cols-2 border-t border-border pt-4">
        <div>
          <p className="text-[13px] text-muted-foreground">投稿時刻</p>
          <p className="mt-1 text-[17px] font-semibold">{timeLabel(post.createdAt)}</p>
        </div>
        <div className="border-l border-border pl-4">
          <p className="text-[13px] text-muted-foreground">文字数</p>
          <p className="mt-1 text-[17px] font-semibold">{post.body.length}字</p>
        </div>
      </div>
    </div>
  );
}
