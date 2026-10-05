import { exportPostPdf } from "@/lib/postPdf";
import { ReplyComposer } from "@/components/ReplyComposer";
import { NotificationBell } from "@/components/NotificationBell";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { useQuery } from "@tanstack/react-query";
import { fetchProfile } from "@/lib/profiles";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { useDesktopNavigation } from "@/hooks/useDesktopNavigation";
import { useBottomBarLabels } from "@/hooks/useBottomBarLabels";
import { BookmarkButton } from "@/components/BookmarkButton";
import { useBookmarks } from "@/hooks/useBookmarks";
import { t, useLanguage } from "@/lib/language";
import { LikeIconGlyph, useLikeIcon } from "@/hooks/useLikeIcon";
import { isDevelopmentSession, isGuestSession } from "@/lib/development";
import { toast } from "sonner";
import { Bookmark, Download, Fish, House, List as ListIcon, MessageCircle, Search, SquarePen, Settings, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

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

type Tab = "home" | "mine" | "bookmarks" | "notifications" | "search" | "lists";

function Avatar({ initial, index }: { initial: string; index: number }) {
  useLanguage();
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
  useLanguage();
  return (
    <span className="inline-flex items-center gap-1.5 text-xl font-bold text-foreground">
      <Fish className="h-[18px] w-[18px] text-[hsl(var(--brand))]" aria-hidden />
      {t("イルカ")}</span>
  );
}

function PostButton({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick: () => void }) {
  useLanguage();
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
  useLanguage();
  const { isSigningIn, error, signIn, clearError, canSkipLogin, skipLogin } = useAuth();
  return (
    <div className="py-6">
      <h2 className="text-[28px] font-bold leading-tight">{title}</h2>
      <p className="mt-2 text-base text-muted-foreground">{message}</p>
      {error ? (
        <p className="mt-3 text-sm text-red-500">
          {t(error)}{" "}
          <button type="button" onClick={clearError} className="underline">
            {t("閉じる")}</button>
        </p>
      ) : null}
      <div className="mt-5 grid gap-3">
        <PostButton label={isSigningIn ? t("ログイン中…") : t("Googleで続ける")} disabled={isSigningIn} onClick={() => void signIn("google")} />
        <button
          type="button"
          disabled={isSigningIn}
          onClick={() => void signIn("apple")}
          className="h-[52px] w-full rounded-full bg-black text-[17px] font-semibold text-white disabled:opacity-40"
        >
          {t("Appleで続ける")}</button>
        {canSkipLogin ? <button type="button" disabled={isSigningIn} onClick={skipLogin}
          className="min-h-11 rounded-full border border-input px-4 text-base text-muted-foreground">{t("開発用にログインをスキップ")}</button> : null}
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
  useLanguage();
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
            {t("新しい投稿")}</h2>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center text-muted-foreground" aria-label={t("閉じる")}>
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
            <p className="pointer-events-none absolute left-3.5 top-4 text-[17px] text-muted-foreground">{t("今の気持ちを、70字まで。")}</p>
          ) : null}
          <textarea
            autoFocus
            value={draft}
            maxLength={MAX_CHARACTERS}
            onChange={(event) => setDraft(event.target.value.slice(0, MAX_CHARACTERS))}
            className="h-[220px] w-full resize-none bg-transparent p-3.5 text-[17px] text-foreground outline-none"
            aria-label={t("投稿本文")}
          />
        </div>
        <p className={`mt-3 text-right font-mono text-[15px] ${count >= MAX_CHARACTERS ? "text-red-500" : "text-muted-foreground"}`}>
          {count} / {MAX_CHARACTERS}
        </p>
        <div className="mt-4">
          <PostButton
            label={t("投稿する")}
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

export function Shell({
  tab,
  children,
  onCompose,
}: {
  tab: Tab;
  children: ReactNode;
  onCompose: () => void;
}) {
  useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showBottomBarLabels } = useBottomBarLabels();
  const { useDesktopBottomBar } = useDesktopNavigation();
  useEffect(() => {
    if (location.state?.compose === true) {
      navigate(location.pathname, { replace: true, state: null });
      if (!user) navigate("/mine");
      else onCompose();
    }
  }, [location.state, location.pathname, navigate, user, onCompose]);
  function compose() {
    if (!user) { navigate("/mine"); return; }
    onCompose();
  }
  return (
    <div className={`mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background text-foreground ${useDesktopBottomBar ? "" : "lg:max-w-[760px] lg:pl-[220px]"}`}>
      {!useDesktopBottomBar && <DesktopSidebar tab={tab} onCompose={compose} />}
      <header className="sticky top-0 z-10 border-b border-border/80 bg-background/75 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <Wordmark />
          <Link to="/settings" aria-label={t("設定")} className="grid min-h-11 min-w-11 place-items-center text-muted-foreground">
            <Settings className="h-5 w-5" aria-hidden />
          </Link>
        </div>
        {isDevelopmentSession() ? <p className="mt-1 text-sm text-muted-foreground">{t(isGuestSession() ? "ゲストモード・このブラウザに保存" : "開発モード・このブラウザに保存")}</p> : null}
      </header>
      <main className={`flex-1 px-5 pb-24 ${useDesktopBottomBar ? "" : "lg:pb-8"}`}>{children}</main>
      <div className={`fixed bottom-0 left-1/2 z-20 w-full max-w-[430px] -translate-x-1/2 ${useDesktopBottomBar ? "" : "lg:hidden"}`}>
        <button
          type="button"
          onClick={compose}
          aria-label={t("投稿を作成")}
          className="absolute bottom-[calc(100%+14px)] right-4 grid h-14 w-14 place-items-center rounded-full bg-[hsl(var(--brand))] text-white shadow-lg shadow-black/15 transition active:scale-90"
        >
          <SquarePen className="h-6 w-6" aria-hidden />
        </button>
        <nav aria-label={t("メインナビゲーション")} className="grid grid-cols-6 border-t border-border/60 bg-background/70 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
          <Link to="/" aria-label={t("ホーム")} className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs ${tab === "home" ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <House className="h-5 w-5" aria-hidden />
            {showBottomBarLabels && <span>{t("ホーム")}</span>}</Link>
          <Link to="/search" aria-label={t("検索")} className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs ${tab === "search" ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <Search className="h-5 w-5" aria-hidden />
            {showBottomBarLabels && <span>{t("検索")}</span>}
          </Link>
          <Link to="/bookmarks" aria-label={t("ブックマーク")} className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs ${tab === "bookmarks" ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <Bookmark className="h-5 w-5" aria-hidden />
            {showBottomBarLabels && <span>{t("ブックマーク")}</span>}
          </Link>
          <Link to="/lists" aria-label={t("リスト")} className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs ${tab === "lists" ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <ListIcon className="h-5 w-5" aria-hidden />
            {showBottomBarLabels && <span>{t("リスト")}</span>}
          </Link>
          <Link to="/notifications" className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs ${tab === "notifications" ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <span className="sr-only">{t("通知")}</span><NotificationBell />
            {showBottomBarLabels && <span aria-hidden>{t("通知")}</span>}
          </Link>
          <Link to="/mine" aria-label={t("自分")} className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs ${tab === "mine" ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <UserRound className="h-5 w-5" aria-hidden />
            {showBottomBarLabels && <span>{t("自分")}</span>}</Link>
        </nav>
      </div>
    </div>
  );
}

export function Row({ post, showAuthor, onLike }: { post: Post; showAuthor: boolean; onLike: () => void | Promise<void> }) {
  useLanguage();
  return (
    <div className="border-b border-border py-3">
    {post.parentId && <Link to={`/post/${post.parentId}`} className="mb-2 inline-flex min-h-11 items-center text-sm text-muted-foreground">{t("返信先の投稿")}</Link>}
    <div className="flex gap-3">
      {post.userId ? (
        <Link to={`/profile/${encodeURIComponent(post.userId)}`} aria-label={t("プロフィール")} className="shrink-0">
          <Avatar initial={post.initial} index={post.avatarIndex} />
        </Link>
      ) : <Avatar initial={post.initial} index={post.avatarIndex} />}
      <span className="min-w-0 pt-0.5">
        {showAuthor ? (post.userId ? (
          <Link to={`/profile/${encodeURIComponent(post.userId)}`} className="block text-base font-semibold text-foreground">{post.authorName}</Link>
        ) : <span className="block text-base font-semibold">{post.authorName}</span>) : null}
        <Link to={`/post/${post.id}`} className="block text-base leading-snug">{post.body}</Link>
      </span>
    </div>
    <div className="ml-[58px] flex items-center gap-2"><LikeButton post={post} onClick={onLike} /><BookmarkButton postId={post.id} /><Link to={`/post/${post.id}`} aria-label={t("返信")} className="grid min-h-11 min-w-11 place-items-center text-muted-foreground"><MessageCircle className="h-5 w-5" aria-hidden /></Link></div>
    </div>
  );
}

function LikeButton({ post, onClick }: { post: Post; onClick: () => void | Promise<void> }) {
  useLanguage();
  const [pending, setPending] = useState(false);
  const { likeIcon } = useLikeIcon();
  const selectedColor = { heart: "text-pink-500", star: "text-amber-500", "thumbs-up": "text-blue-500", upvote: "text-orange-500" }[likeIcon];
  return <button type="button" disabled={pending} aria-busy={pending} onClick={async () => {
    if (pending) return;
    setPending(true);
    try { await onClick(); } finally { setPending(false); }
  }} aria-pressed={Boolean(post.isLiked)}
    aria-label={post.isLiked ? t("いいねを取り消す") : t("いいね")}
    className={`inline-flex min-h-11 min-w-11 items-center gap-2 rounded-full px-2 transition ${post.isLiked ? selectedColor : "text-muted-foreground"} hover:bg-muted`}>
    <LikeIconGlyph className="h-5 w-5" liked={Boolean(post.isLiked)} />
    <span>{post.likeCount ?? 0}</span>
  </button>;
}

/** 保存済みプロフィールの表示名・ハンドル・頭文字。プロフィール編集がすぐ反映される。 */
function useOwnProfile() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["ownProfile", user?.id],
    queryFn: async () => (user?.id ? await fetchProfile(user.id) : null),
    enabled: Boolean(user?.id) && !isGuestSession(),
  });
  if (!user) return null;
  const name = query.data?.name || displayName(user);
  return {
    name,
    handle: query.data?.handle ? `@${query.data.handle}` : userHandle(user),
    initial: Array.from(name)[0] ?? "い",
  };
}

export function HomePage() {
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

export function SearchPage() {
  useLanguage();
  const { user } = useAuth();
  const own = useOwnProfile();
  const [posts, setPosts] = useState<Post[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError("");
    fetchPosts(user?.id)
      .then((next) => { if (!cancelled) setPosts(next); })
      .catch(() => { if (!cancelled) setError("タイムラインを読み込めませんでした。"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id, retry]);

  const keyword = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!keyword) return [];
    return sortTimeline(posts).filter((post) =>
      post.body.toLowerCase().includes(keyword)
      || post.authorName.toLowerCase().includes(keyword)
      || post.handle.toLowerCase().includes(keyword));
  }, [posts, keyword]);

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
      const post = await insertPost(body, user);
      if (activeUser.current === user.id) setPosts((current) => [post, ...current]);
    } catch { toast.error(t("投稿できませんでした。もう一度試してください。")); }
  }

  return (
    <>
      <Shell tab="search" onCompose={() => setOpen(true)}>
        <div className="pt-4">
          <h1 className="text-[28px] font-bold">{t("検索")}</h1>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("キーワードで投稿を検索")}
              aria-label={t("検索")}
              className="h-11 w-full rounded-full border border-input bg-muted/60 pl-11 pr-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-[hsl(var(--brand))]"
            />
          </div>
        </div>
        {error ? <p role="alert" className="mt-4 text-sm text-red-500">{t(error)}</p> : null}
        {loading ? <p role="status" className="py-10 text-muted-foreground">{t("読み込み中…")}</p> :
          !keyword ? <p className="py-10 text-center text-muted-foreground">{t("ユーザー名や本文のキーワードで投稿を探せます。")}</p> :
          results.length ? results.map((post) => <Row key={post.id} post={post} showAuthor onLike={() => like(post.id)} />) :
          <p className="py-10 text-center text-muted-foreground">{t("該当する投稿がありません。")}</p>}
      </Shell>
      {open && user ? <ComposeSheet onClose={() => setOpen(false)} onPost={add}
        authorName={own?.name ?? displayName(user)} handle={own?.handle ?? userHandle(user)} initial={own?.initial ?? displayName(user).slice(0, 1)} /> : null}
    </>
  );
}

export function MinePage() {
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

export function PostPage() {
  useLanguage();
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

export function BookmarksPage() {
  useLanguage();
  const { user } = useAuth();
  const own = useOwnProfile();
  const { ids, loading: bookmarksLoading, error: bookmarkError, refresh: refreshBookmarks } = useBookmarks(user?.id);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [open, setOpen] = useState(false);
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
  async function add(body: string) {
    if (!user) return;
    const userId = user.id;
    try {
      const post = await insertPost(body, user);
      if (activeUser.current === userId) setPosts((current) => [post, ...current]);
    } catch { toast.error(t("投稿できませんでした。もう一度試してください。")); }
  }
  return <>
    <Shell tab="bookmarks" onCompose={() => setOpen(true)}>
      <h1 className="pt-4 text-[28px] font-bold">{t("ブックマーク")}</h1>
      <p className="mb-4 mt-2 text-base text-muted-foreground">{t(isDevelopmentSession() ? (isGuestSession() ? "ゲストモードのブックマークはこの端末に保存されます。" : "開発モードのブックマークはこの端末に保存されます。") : "ブックマークはアカウントに保存され、端末間で共有されます。")}</p>
      {!user ? <SignInPanel title={t("ブックマーク")} message={t("ブックマークするにはログインしてください。")} /> :
        loading || bookmarksLoading ? <p role="status" className="py-10 text-muted-foreground">{t("読み込み中…")}</p> :
        error || bookmarkError ? <div className="py-6"><p role="alert">{t(error || bookmarkError)}</p><button type="button" onClick={() => { setRetry((value) => value + 1); void refreshBookmarks().catch(() => {}); }} className="min-h-11 text-[hsl(var(--brand))]">{t("再読み込み")}</button></div> :
        savedPosts.length ? savedPosts.map((post) => <Row key={post.id} post={post} showAuthor onLike={() => like(post)} />) :
        <p className="py-10 text-center text-muted-foreground">{t("まだブックマークがありません。")}</p>}
    </Shell>
    {open && user ? <ComposeSheet onClose={() => setOpen(false)} onPost={add}
      authorName={own?.name ?? displayName(user)} handle={own?.handle ?? userHandle(user)} initial={own?.initial ?? displayName(user).slice(0, 1)} /> : null}
  </>;
}

export function NotificationsPage() {
  useLanguage();
  const { user } = useAuth();
  const notifications = useNotifications();
  const own = useOwnProfile();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  async function add(body: string) {
    if (!user) return;
    try { const post = await insertPost(body, user); navigate(`/post/${post.id}`); }
    catch { toast.error(t("投稿できませんでした。もう一度試してください。")); }
  }
  async function openNotification(item: AppNotification) {
    try { await notifications.markRead(item); navigate(`/post/${item.post_id}`); }
    catch { toast.error(t("通知を既読にできませんでした。")); }
  }
  return <>
    <Shell tab="notifications" onCompose={() => setOpen(true)}>
      <div className="flex items-center justify-between gap-3 pt-4">
        <h1 className="text-[28px] font-bold">{t("通知")}</h1>
        {notifications.unreadCount > 0 && <button type="button" disabled={notifications.marking}
          onClick={() => void notifications.markAllRead().catch(() => toast.error(t("通知を既読にできませんでした。")))}
          className="min-h-11 text-sm text-[hsl(var(--brand))] disabled:opacity-50">{t("すべて既読にする")}</button>}
      </div>
      <p className="mb-4 mt-2 text-base text-muted-foreground">{t("自分の投稿へのいいねをお知らせします。")}</p>
      {!user ? <SignInPanel title={t("通知")} message={t("通知を見るにはログインしてください。")} /> :
        isDevelopmentSession() ? <p className="py-10 text-muted-foreground">{t(isGuestSession() ? "ゲストモードでは通知は届きません。" : "開発モードでは通知は届きません。")}</p> :
        notifications.loading ? <p role="status" className="py-10 text-muted-foreground">{t("読み込み中…")}</p> :
        notifications.error ? <div className="py-6"><p role="alert">{t("通知を読み込めませんでした。")}</p><button type="button" onClick={() => void notifications.refresh()} className="min-h-11 text-[hsl(var(--brand))]">{t("再読み込み")}</button></div> :
        notifications.rows.length ? <>
          {notifications.rows.map((item) => <button type="button" key={item.id} disabled={notifications.marking}
            onClick={() => void openNotification(item)}
            className={`flex min-h-20 w-full gap-3 border-b border-border px-3 py-4 text-left disabled:opacity-50 ${item.read_at ? "" : "bg-muted/60"}`}>
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--brand))]" style={{ opacity: item.read_at ? 0 : 1 }} aria-hidden />
            <span className="min-w-0">
              {!item.read_at && <span className="sr-only">{t("未読の通知")}: </span>}
              <span className="block font-medium">{item.is_grouped ? t("{count}人があなたの投稿にいいねしました。").replace("{count}", "20+") : t("{name}さんがいいねしました。").replace("{name}", item.actor_name ?? t("ユーザー"))}</span>
              <span className="mt-1 block break-words text-sm text-muted-foreground">{item.post_body}</span>
              <time dateTime={item.created_at} className="mt-2 block text-xs text-muted-foreground">{timeLabel(item.created_at)}</time>
            </span>
          </button>)}
          {notifications.hasMore && <button type="button" disabled={notifications.loadingMore} onClick={() => void notifications.loadMore()}
            className="min-h-11 w-full text-[hsl(var(--brand))]">{t("もっと見る")}</button>}
        </> : <p className="py-10 text-center text-muted-foreground">{t("まだ通知がありません。")}</p>}
    </Shell>
    {open && user ? <ComposeSheet onClose={() => setOpen(false)} onPost={add}
      authorName={own?.name ?? displayName(user)} handle={own?.handle ?? userHandle(user)} initial={own?.initial ?? displayName(user).slice(0, 1)} /> : null}
  </>;
}

