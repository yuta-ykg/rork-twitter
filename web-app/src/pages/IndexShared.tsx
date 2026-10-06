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
import { Bookmark, List, Fish, Gamepad2, House, Menu, MessageCircle, Search, SquarePen, Settings, UserRound, UsersRound, X, Sparkles, Trophy } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/authContext";
import { avatarFills, type Post } from "@/lib/posts";
import { PostPollCard } from "@/components/PostPollCard";
import { PostDiagnosisCard } from "@/components/PostDiagnosisCard";

type Tab = "home" | "mine" | "bookmarks" | "notifications" | "search" | "lists" | "communities" | "diagnoses" | "games" | "rankings" | "settings";

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

export function Shell({
  tab,
  children,
}: {
  tab: Tab;
  children: ReactNode;
}) {
  useLanguage();
  useDateDisplay();
  const navigate = useNavigate();
  const { showBottomBarLabels } = useBottomBarLabels();
  const { useDesktopBottomBar } = useDesktopNavigation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuPanelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const focusableElements = () => Array.from(mobileMenuPanelRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []);
    const firstFocusable = focusableElements()[0];
    firstFocusable?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        mobileMenuButtonRef.current?.focus();
        return;
      }
      if (event.key === "Tab") {
        const items = focusableElements();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);
  function compose() {
    navigate("/compose");
  }
  function closeMobileMenu() {
    setMobileMenuOpen(false);
    mobileMenuButtonRef.current?.focus();
  }
  return (
    <div className={`mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background text-foreground ${useDesktopBottomBar ? "" : "lg:max-w-[760px] lg:pl-[220px]"}`}>
      {!useDesktopBottomBar && <DesktopSidebar tab={tab} onCompose={compose} />}
      <header className="sticky top-0 z-10 border-b border-border/80 bg-background/75 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button ref={mobileMenuButtonRef} type="button" onClick={() => setMobileMenuOpen(true)} aria-label={t("メニューを開く")} aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation-menu" className="grid min-h-11 min-w-11 place-items-center rounded-full text-muted-foreground hover:bg-muted lg:hidden">
              <Menu className="h-5 w-5" aria-hidden />
            </button>
            <Wordmark />
          </div>
          <div className="hidden items-center lg:flex">
          <Link to="/rankings" aria-label={t("ランキング")} aria-current={tab === "rankings" ? "page" : undefined} className={`grid min-h-11 min-w-11 place-items-center ${tab === "rankings" ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <Trophy className="h-5 w-5" aria-hidden />
          </Link>
          <Link to="/games" aria-label={t("ゲームセンター")} aria-current={tab === "games" ? "page" : undefined} className={`grid min-h-11 min-w-11 place-items-center ${tab === "games" ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <Gamepad2 className="h-5 w-5" aria-hidden />
          </Link>
          <Link to="/diagnoses" aria-label={t("診断を探す")} aria-current={tab === "diagnoses" ? "page" : undefined} className={`grid min-h-11 min-w-11 place-items-center ${tab === "diagnoses" ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <Sparkles className="h-5 w-5" aria-hidden />
          </Link>
          <Link to="/communities" aria-label={t("コミュニティ")} aria-current={tab === "communities" ? "page" : undefined} className={`grid min-h-11 min-w-11 place-items-center ${tab === "communities" ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <UsersRound className="h-5 w-5" aria-hidden />
          </Link>
          <Link to="/lists" aria-label={t("リスト")} aria-current={tab === "lists" ? "page" : undefined} className={`grid min-h-11 min-w-11 place-items-center ${tab === "lists" ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <List className="h-5 w-5" aria-hidden />
          </Link>
          <Link to="/settings" aria-label={t("設定")} className="grid min-h-11 min-w-11 place-items-center text-muted-foreground">
            <Settings className="h-5 w-5" aria-hidden />
          </Link>
          </div>
        </div>
        {isDevelopmentSession() ? <p className="mt-1 text-sm text-muted-foreground">{t(isGuestSession() ? "ゲストモード・このブラウザに保存" : "開発モード・このブラウザに保存")}</p> : null}
      </header>
      {mobileMenuOpen ? (
        <>
          <button type="button" aria-label={t("メニューを閉じる")} onClick={closeMobileMenu} className="fixed inset-0 z-30 bg-black/40 lg:hidden" />
          <aside id="mobile-navigation-menu" ref={mobileMenuPanelRef} role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title" className="fixed inset-y-0 left-0 z-40 flex w-[82vw] max-w-[320px] flex-col overflow-y-auto border-r border-border bg-background px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))] shadow-2xl lg:hidden">
            <div className="mb-3 flex min-h-12 items-center justify-between px-1">
              <h2 id="mobile-menu-title" className="font-semibold">{t("メニュー")}</h2>
              <button type="button" onClick={closeMobileMenu} aria-label={t("メニューを閉じる")} className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <nav aria-label={t("メニュー")} className="grid gap-1">
              <Link to="/" onClick={closeMobileMenu} aria-current={tab === "home" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "home" ? "bg-muted text-[hsl(var(--brand))]" : "text-foreground"}`}><House className="h-5 w-5" aria-hidden />{t("ホーム")}</Link>
              <Link to="/search" onClick={closeMobileMenu} aria-current={tab === "search" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "search" ? "bg-muted text-[hsl(var(--brand))]" : "text-foreground"}`}><Search className="h-5 w-5" aria-hidden />{t("検索")}</Link>
              <button type="button" onClick={() => { closeMobileMenu(); compose(); }} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-[hsl(var(--brand))]"><SquarePen className="h-5 w-5" aria-hidden />{t("投稿")}</button>
              <Link to="/bookmarks" onClick={closeMobileMenu} aria-current={tab === "bookmarks" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "bookmarks" ? "bg-muted text-[hsl(var(--brand))]" : "text-foreground"}`}><Bookmark className="h-5 w-5" aria-hidden />{t("ブックマーク")}</Link>
              <Link to="/notifications" onClick={closeMobileMenu} aria-current={tab === "notifications" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "notifications" ? "bg-muted text-[hsl(var(--brand))]" : "text-foreground"}`}><NotificationBell />{t("通知")}</Link>
              <Link to="/lists" onClick={closeMobileMenu} aria-current={tab === "lists" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "lists" ? "bg-muted text-[hsl(var(--brand))]" : "text-foreground"}`}><List className="h-5 w-5" aria-hidden />{t("リスト")}</Link>
              <Link to="/communities" onClick={closeMobileMenu} aria-current={tab === "communities" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "communities" ? "bg-muted text-[hsl(var(--brand))]" : "text-foreground"}`}><UsersRound className="h-5 w-5" aria-hidden />{t("コミュニティ")}</Link>
              <Link to="/diagnoses" onClick={closeMobileMenu} aria-current={tab === "diagnoses" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "diagnoses" ? "bg-muted text-[hsl(var(--brand))]" : "text-foreground"}`}><Sparkles className="h-5 w-5" aria-hidden />{t("診断を探す")}</Link>
              <Link to="/games" onClick={closeMobileMenu} aria-current={tab === "games" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "games" ? "bg-muted text-[hsl(var(--brand))]" : "text-foreground"}`}><Gamepad2 className="h-5 w-5" aria-hidden />{t("ゲームセンター")}</Link>
              <Link to="/rankings" onClick={closeMobileMenu} aria-current={tab === "rankings" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "rankings" ? "bg-muted text-[hsl(var(--brand))]" : "text-foreground"}`}><Trophy className="h-5 w-5" aria-hidden />{t("ランキング")}</Link>
              <Link to="/mine" onClick={closeMobileMenu} aria-current={tab === "mine" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "mine" ? "bg-muted text-[hsl(var(--brand))]" : "text-foreground"}`}><UserRound className="h-5 w-5" aria-hidden />{t("自分")}</Link>
              <Link to="/settings" onClick={closeMobileMenu} aria-current={tab === "settings" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "settings" ? "bg-muted text-[hsl(var(--brand))]" : "text-foreground"}`}><Settings className="h-5 w-5" aria-hidden />{t("設定")}</Link>
            </nav>
          </aside>
        </>
      ) : null}
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
        <nav aria-label={t("メインナビゲーション")} className="grid grid-cols-5 border-t border-border/60 bg-background/70 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
          <Link to="/" aria-label={t("ホーム")} aria-current={tab === "home" ? "page" : undefined} className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs ${tab === "home" ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <House className="h-5 w-5" aria-hidden />
            {showBottomBarLabels && <span>{t("ホーム")}</span>}</Link>
          <Link to="/search" aria-label={t("検索")} aria-current={tab === "search" ? "page" : undefined} className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs ${tab === "search" ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <Search className="h-5 w-5" aria-hidden />
            {showBottomBarLabels && <span>{t("検索")}</span>}
          </Link>
          <Link to="/bookmarks" aria-label={t("ブックマーク")} aria-current={tab === "bookmarks" ? "page" : undefined} className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs ${tab === "bookmarks" ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <Bookmark className="h-5 w-5" aria-hidden />
            {showBottomBarLabels && <span>{t("ブックマーク")}</span>}
          </Link>
          <Link to="/notifications" aria-label={t("通知")} aria-current={tab === "notifications" ? "page" : undefined} className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs ${tab === "notifications" ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <span className="sr-only">{t("通知")}</span><NotificationBell />
            {showBottomBarLabels && <span aria-hidden>{t("通知")}</span>}
          </Link>
          <Link to="/mine" aria-label={t("自分")} aria-current={tab === "mine" ? "page" : undefined} className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs ${tab === "mine" ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <UserRound className="h-5 w-5" aria-hidden />
            {showBottomBarLabels && <span>{t("自分")}</span>}</Link>
        </nav>
      </div>
    </div>
  );
}

export function Row({ post, showAuthor, onLike }: { post: Post; showAuthor: boolean; onLike: () => void | Promise<void> }) {
  useLanguage();
  const navigate = useNavigate();
  return (
    <div className="border-b border-border py-3">
    {post.parentId && <Link to={`/post/${post.parentId}`} className="mb-2 inline-flex min-h-11 items-center text-sm text-muted-foreground">{t("返信先の投稿")}</Link>}
    <div className="flex gap-3">
      {post.userId ? (
        <Link to={`/profile/${encodeURIComponent(post.userId)}`} aria-label={t("プロフィール")} className="shrink-0">
          <Avatar initial={post.initial} index={post.avatarIndex} />
        </Link>
      ) : <Avatar initial={post.initial} index={post.avatarIndex} />}
      <div className="min-w-0 flex-1 pt-0.5">
        {showAuthor ? (post.userId ? (
          <Link to={`/profile/${encodeURIComponent(post.userId)}`} className="block text-base font-semibold text-foreground">{post.authorName}</Link>
        ) : <span className="block text-base font-semibold">{post.authorName}</span>) : null}
        <Link to={`/post/${post.id}`} className="block text-base leading-snug">{post.body}</Link>
        {post.poll ? <PostPollCard postId={post.id} initialPoll={post.poll} /> : null}
        {post.diagnosis ? <PostDiagnosisCard diagnosis={post.diagnosis} onShared={(shared) => navigate(`/post/${shared.id}`)} /> : null}
      </div>
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
