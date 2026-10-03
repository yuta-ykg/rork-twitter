import { NotificationBell } from "@/components/NotificationBell";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { useDesktopNavigation } from "@/hooks/useDesktopNavigation";
import { useBottomBarLabels } from "@/hooks/useBottomBarLabels";
import { BookmarkButton } from "@/components/BookmarkButton";
import { t, useLanguage } from "@/lib/language";
import { LikeIconGlyph } from "@/hooks/useLikeIcon";
import { useLikeIcon } from "@/hooks/likeIconState";
import { useDateDisplay } from "@/lib/dateDisplay";
import { isDevelopmentSession, isGuestSession } from "@/lib/development";
import { Bookmark, List, Fish, House, MessageCircle, Search, SquarePen, Settings, UserRound, UsersRound, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/authContext";
import { MAX_CHARACTERS, avatarFills, type Post } from "@/lib/posts";

type Tab = "home" | "mine" | "bookmarks" | "notifications" | "search" | "lists" | "communities";

export function Avatar({ initial, index }: { initial: string; index: number }) {
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

export function Wordmark() {
  useLanguage();
  return (
    <span className="inline-flex items-center gap-1.5 text-xl font-bold text-foreground">
      <Fish className="h-[18px] w-[18px] text-[hsl(var(--brand))]" aria-hidden />
      {t("イルカ")}</span>
  );
}

export function PostButton({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick: () => void }) {
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

export function SignInPanel({ title, message }: { title: string; message: string }) {
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

export function ComposeSheet({
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
  useDateDisplay();
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
          <div className="flex items-center">
          <Link to="/communities" aria-label={t("コミュニティ")} aria-current={tab === "communities" ? "page" : undefined} className={`grid min-h-11 min-w-11 place-items-center ${tab === "communities" ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <UsersRound className="h-5 w-5" aria-hidden />
          </Link>
          <Link to="/settings" aria-label={t("設定")} className="grid min-h-11 min-w-11 place-items-center text-muted-foreground">
            <Settings className="h-5 w-5" aria-hidden />
          </Link>
          </div>
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
        <nav aria-label={t("メインナビゲーション")} className="grid grid-cols-6 border-t border-border/60 bg-background/70 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
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
          <Link to="/notifications" className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs ${tab === "notifications" ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <span className="sr-only">{t("通知")}</span><NotificationBell />
            {showBottomBarLabels && <span aria-hidden>{t("通知")}</span>}
          </Link>
          <Link to="/lists" aria-label={t("リスト")} aria-current={tab === "lists" ? "page" : undefined} className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs ${tab === "lists" ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <List className="h-5 w-5" aria-hidden />
            {showBottomBarLabels && <span>{t("リスト")}</span>}
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

export function LikeButton({ post, onClick }: { post: Post; onClick: () => void | Promise<void> }) {
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

