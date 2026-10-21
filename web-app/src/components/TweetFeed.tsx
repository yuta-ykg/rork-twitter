import { usePostSpeech, togglePostSpeech, stopPostSpeech } from "@/lib/postSpeech";
import { avatarFills, deletePost, fetchPosts, setPostLike, setPostRepost, sortTimeline, updatePostBody, type Post } from "@/lib/posts";
import { t, useLanguage } from "@/lib/language";
import { useAuth } from "@/hooks/authContext";
import { fetchNotifications } from "@/lib/notifications";
import { setRelationship, type RelationKind } from "@/lib/relationships";
import { PostEditHistory } from "@/components/PostEditHistory";
import { PollView } from "@/components/PollView";
import { toast } from "sonner";
import { useOwnProfile } from "@/hooks/useOwnProfile";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Volume2, CircleStop, Ban, Bell, Ellipsis, Link2, Pencil, Trash2, VolumeX, Heart, House, Mail, MessageCircle, Quote, Repeat2, Search, Settings, Share, SquarePen } from "lucide-react";
import type { ReactNode, TouchEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

export function useTimeline() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["timeline", user?.id],
    queryFn: async () => sortTimeline(await fetchPosts(user?.id)),
    enabled: Boolean(user?.id),
  });
}

type TabId = "home" | "search" | "notifications" | "messages";

const tabs: { id: TabId; to: string; label: string; icon: typeof House }[] = [
  { id: "home", to: "/", label: "ホーム", icon: House },
  { id: "search", to: "/search", label: "検索", icon: Search },
  { id: "notifications", to: "/notifications", label: "通知", icon: Bell },
  { id: "messages", to: "/messages", label: "メッセージ", icon: Mail },
];

const PULL_THRESHOLD = 64;

export function TweetShell({ title, tab, showCompose = false, onRefresh, children }: {
  title: string;
  tab: TabId;
  showCompose?: boolean;
  onRefresh?: () => Promise<unknown>;
  children: ReactNode;
}) {
  useLanguage();
  const own = useOwnProfile();
  const { user: authUser } = useAuth();
  const unread = useQuery<boolean>({
    queryKey: ["notifications-unread", authUser?.id],
    enabled: Boolean(authUser?.id),
    refetchInterval: 60000,
    queryFn: async () => (await fetchNotifications(authUser?.id ?? "")).some((item) => item.isNew),
  });
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState<number>(0);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  function onTouchStart(event: TouchEvent<HTMLElement>) {
    startY.current = onRefresh && window.scrollY <= 0 && !refreshing ? event.touches[0].clientY : null;
  }
  function onTouchMove(event: TouchEvent<HTMLElement>) {
    if (startY.current === null) return;
    const delta = event.touches[0].clientY - startY.current;
    setPull(delta > 0 && window.scrollY <= 0 ? Math.min(delta * 0.5, 96) : 0);
  }
  async function onTouchEnd() {
    const shouldRefresh = pull >= PULL_THRESHOLD && onRefresh !== undefined;
    startY.current = null;
    if (!shouldRefresh) {
      setPull(0);
      return;
    }
    setRefreshing(true);
    setPull(PULL_THRESHOLD);
    try {
      await onRefresh();
    } catch {
      toast.error(t("タイムラインを読み込めませんでした。"));
    } finally {
      setRefreshing(false);
      setPull(0);
    }
  }
  return (
    <div className="min-h-dvh bg-muted text-foreground">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background">
        <header className="sticky top-0 z-10 grid h-12 grid-cols-[44px_1fr_44px] items-center border-b border-border bg-background px-3">
          <Link to="/mine" className="grid h-11 w-11 place-items-center" aria-label={t("プロフィール")}>
            <Avatar initial={own?.initial ?? "あ"} index={0} url={own?.avatar} size={32} />
          </Link>
          <h1 className="text-center text-[17px] font-bold">{t(title)}</h1>
          <Link to="/settings" className="grid h-11 w-11 place-items-center text-muted-foreground" aria-label={t("設定")}>
            <Settings className="h-5 w-5" />
          </Link>
        </header>
        <main
          className="flex-1"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={() => void onTouchEnd()}
          onTouchCancel={() => { startY.current = null; setPull(0); }}
        >
          {onRefresh ? (
            <div
              className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
              style={{ height: pull }}
              aria-hidden={!refreshing}
            >
              <span
                className={`h-6 w-6 rounded-full border-2 border-[#1D9BF0] border-t-transparent ${refreshing ? "animate-spin" : ""}`}
                style={{ opacity: Math.min(pull / PULL_THRESHOLD, 1), transform: refreshing ? undefined : `rotate(${pull * 4}deg)` }}
              />
            </div>
          ) : null}
          {children}
        </main>
        {showCompose ? (
          <Link
            to="/compose"
            aria-label={t("投稿する")}
            className="fixed bottom-[76px] lg:hidden right-[max(16px,calc(50vw-224px))] grid h-14 w-14 place-items-center rounded-full bg-[#1D9BF0] text-white shadow-[0_4px_12px_rgba(29,155,240,0.35)] transition active:scale-95"
          >
            <SquarePen className="h-[22px] w-[22px]" />
          </Link>
        ) : null}
        <nav className="sticky bottom-0 z-10 border-t lg:hidden border-border bg-background pb-[env(safe-area-inset-bottom)]" aria-label={t("メインナビゲーション")}>
          <div className="grid grid-cols-4">
            {tabs.map((item) => {
              const Icon = item.icon;
              const selected = item.id === tab;
              return (
                <NavLink
                  key={item.id}
                  to={item.to}
                  end={item.to === "/"}
                  aria-label={t(item.label)}
                  aria-current={selected ? "page" : undefined}
                  className="grid h-12 place-items-center"
                >
                  <span className="relative">
                    <Icon className="h-[22px] w-[22px]" strokeWidth={selected ? 2.4 : 1.8} color={selected ? "#1D9BF0" : "#536471"} />
                    {item.id === "notifications" && unread.data && !selected ? (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-[#1D9BF0]" aria-hidden />
                    ) : null}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

export function TweetList({ posts, empty, searching = false }: { posts: Post[]; empty: string; searching?: boolean }) {
  if (posts.length === 0) {
    return (
      <div className="px-7 pt-16 text-center">
        <p className="text-base font-semibold">{t(empty)}</p>
        {searching ? null : <p className="mt-2 text-sm text-muted-foreground">{t("70字以内で、いまの気持ちを残しましょう。")}</p>}
      </div>
    );
  }
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id} className="border-b border-border">
          <TweetRow post={post} />
        </li>
      ))}
    </ul>
  );
}

export function TweetRow({ post }: { post: Post }) {
  const speakingId = usePostSpeech();
  const isSpeaking = speakingId === post.id;
  const speakingRef = useRef(isSpeaking);
  speakingRef.current = isSpeaking;
  useEffect(() => () => { if (speakingRef.current) stopPostSpeech(); }, []);
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const like = useMutation({
    mutationFn: (next: boolean) => setPostLike(post.id, next, user?.id ?? ""),
    onMutate: async (next: boolean) => {
      const key = ["timeline", user?.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Post[]>(key);
      queryClient.setQueryData<Post[]>(key, (current) =>
        current?.map((item) => item.id === post.id
          ? { ...item, liked: next, likeCount: Math.max(0, (item.likeCount ?? 0) + (next ? 1 : -1)) }
          : item));
      return { previous };
    },
    onError: (_error, _next, context) => {
      if (context?.previous) queryClient.setQueryData(["timeline", user?.id], context.previous);
    },
    onSuccess: (result) => {
      queryClient.setQueryData<Post[]>(["timeline", user?.id], (current) =>
        current?.map((item) => item.id === post.id ? { ...item, liked: result.liked, likeCount: result.count } : item));
    },
  });
  const liked = post.liked ?? false;
  const likeCount = post.likeCount ?? 0;
  const navigate = useNavigate();
  const timeline = useTimeline();
  const quoted = post.quoteOf ? timeline.data?.find((item) => item.id === post.quoteOf) : undefined;
  const parent = post.replyTo ? timeline.data?.find((item) => item.id === post.replyTo) : undefined;
  const replyCount = (timeline.data ?? []).filter((item) => item.replyTo === post.id).length;
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [moreOpen, setMoreOpen] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [editing, setEditing] = useState<boolean>(false);
  const [draftBody, setDraftBody] = useState<string>("");
  const canModerate = Boolean(post.userId) && !post.isMine;
  const draftLength = Array.from(draftBody).length;
  const saveEdit = useMutation({
    mutationFn: () => updatePostBody(post.id, draftBody, user?.id ?? ""),
    onSuccess: async () => {
      setEditing(false);
      toast.success(t("投稿を更新しました"));
      await queryClient.invalidateQueries({ queryKey: ["timeline", user?.id] });
    },
    onError: () => toast.error(t("投稿を更新できませんでした。")),
  });
  const remove = {
    isPending: false,
    mutate: () => {
      const key = ["timeline", user?.id];
      const userId = user?.id ?? "";
      const previous = queryClient.getQueryData<Post[]>(key);
      setConfirmDelete(false);
      queryClient.setQueryData<Post[]>(key, (current) => (current ?? []).filter((item) => item.id !== post.id));
      let undone = false;
      const timer = window.setTimeout(() => {
        if (undone) return;
        deletePost(post.id, userId)
          .then(() => queryClient.invalidateQueries({ queryKey: key }))
          .catch(() => {
            if (previous) queryClient.setQueryData(key, previous);
            toast.error(t("投稿を削除できませんでした。"));
          });
      }, 5000);
      toast(t("投稿を削除しました"), {
        duration: 5000,
        action: {
          label: t("取り消す"),
          onClick: () => {
            undone = true;
            window.clearTimeout(timer);
            if (previous) queryClient.setQueryData(key, previous);
            void queryClient.invalidateQueries({ queryKey: key });
          },
        },
      });
    },
  };
  const postUrl = `https://yytblue.com/post/${post.id}`;
  const copyLink = async (): Promise<void> => {
    const legacyCopy = (): boolean => {
      const area = document.createElement("textarea");
      area.value = postUrl;
      area.setAttribute("readonly", "");
      area.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(area);
      area.select();
      area.setSelectionRange(0, postUrl.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    };
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(postUrl);
      else if (!legacyCopy()) throw new Error("copy unsupported");
      toast.success(t("コピーしました"));
    } catch {
      try {
        if (!legacyCopy()) throw new Error("copy failed");
        toast.success(t("コピーしました"));
      } catch {
        toast.error(t("操作できませんでした。もう一度試してください。"));
      }
    }
  };
  const sharePost = async (): Promise<void> => {
    if (typeof navigator.share !== "function") {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ text: post.body, url: postUrl });
    } catch {
      // ユーザーが共有シートを閉じた場合は何もしない
    }
  };
  const relate = useMutation({
    mutationFn: (kind: RelationKind) => setRelationship(post.userId ?? "", kind, true, user?.id ?? ""),
    onSuccess: async (_data, kind) => {
      toast.success(t(kind === "block" ? "ブロックしました" : "ミュートしました"));
      await queryClient.invalidateQueries({ queryKey: ["timeline", user?.id] });
    },
    onError: () => toast.error(t("操作できませんでした。もう一度試してください。")),
  });
  const reposted = post.reposted ?? false;
  const repostCount = post.repostCount ?? 0;
  const repost = useMutation({
    mutationFn: (next: boolean) => setPostRepost(post.id, next, user?.id ?? ""),
    onMutate: async (next: boolean) => {
      const key = ["timeline", user?.id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Post[]>(key);
      queryClient.setQueryData<Post[]>(key, (current) =>
        current?.map((item) => item.id === post.id
          ? { ...item, reposted: next, repostCount: Math.max(0, (item.repostCount ?? 0) + (next ? 1 : -1)) }
          : item));
      return { previous };
    },
    onError: (_error, _next, context) => {
      if (context?.previous) queryClient.setQueryData(["timeline", user?.id], context.previous);
    },
    onSuccess: (result) => {
      queryClient.setQueryData<Post[]>(["timeline", user?.id], (current) =>
        current?.map((item) => item.id === post.id ? { ...item, reposted: result.reposted, repostCount: result.count } : item));
    },
  });
  return (
    <article className={`flex gap-2.5 px-4 py-3 transition-colors duration-200 motion-reduce:transition-none ${isSpeaking ? "bg-[#1D9BF0]/10" : ""}`} aria-label={`${post.authorName} ${post.handle}. ${post.body}`}>
      <Link to={post.isMine ? "/mine" : post.userId ? `/u/${post.userId}` : "#"} className="h-fit shrink-0" aria-label={post.authorName}>
        <Avatar initial={post.initial} index={post.avatarIndex} url={post.avatarUrl} size={40} />
      </Link>
      <div className="min-w-0 flex-1">
        {isSpeaking ? <button type="button" onClick={stopPostSpeech} className="flex min-h-11 items-center gap-2 text-sm text-[#1D9BF0]"><CircleStop className="h-4 w-4" aria-hidden />{t("読み上げを停止")}</button> : null}
        <div className="flex items-baseline gap-1 text-[15px]">
          <Link to={post.isMine ? "/mine" : post.userId ? `/u/${post.userId}` : "#"} className="flex min-w-0 items-baseline gap-1">
            <span className="truncate font-bold">{post.authorName}</span>
            <span className="truncate text-muted-foreground">{post.handle}</span>
          </Link>
          <span className="text-muted-foreground">·</span>
          <span className="shrink-0 text-muted-foreground">{tweetAge(post.createdAt, language)}</span>
          {isSpeaking ? (
            <span role="status" className="inline-flex shrink-0 self-center text-[#1D9BF0]" title={t("読み上げ中")}>
              <Volume2 className="h-4 w-4" aria-hidden />
              <span className="sr-only">{t("読み上げ中")}</span>
            </span>
          ) : null}
          {(
            <div className="relative ml-auto">
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                aria-label={t("投稿のメニュー")}
                className="-mr-2 grid h-9 w-9 place-items-center rounded-full"
              >
                <Ellipsis className="h-[18px] w-[18px] text-muted-foreground" aria-hidden />
              </button>
              {moreOpen ? (
                <>
                  <button type="button" aria-label={t("閉じる")} className="fixed inset-0 z-20 cursor-default" onClick={() => setMoreOpen(false)} />
                  <div role="menu" className="absolute right-0 top-9 z-30 w-56 overflow-hidden rounded-2xl border border-border bg-background py-1 text-[15px] font-bold text-foreground shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
                    <button type="button" role="menuitem" onClick={() => { setMoreOpen(false); togglePostSpeech(post.id, post.body, language); }} className="flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left active:bg-muted">
                      {isSpeaking ? <CircleStop className="h-[18px] w-[18px]" aria-hidden /> : <Volume2 className="h-[18px] w-[18px]" aria-hidden />}
                      <span>{t(isSpeaking ? "読み上げを停止" : "投稿を読み上げ")}</span>
                    </button>
                    <button type="button" role="menuitem" onClick={() => { setMoreOpen(false); void sharePost(); }} className="flex h-11 w-full items-center gap-3 px-4 text-left active:bg-muted">
                      <Share className="h-[18px] w-[18px]" aria-hidden />
                      <span>{t("共有")}</span>
                    </button>
                    <button type="button" role="menuitem" onClick={() => { setMoreOpen(false); void copyLink(); }} className="flex h-11 w-full items-center gap-3 px-4 text-left active:bg-muted">
                      <Link2 className="h-[18px] w-[18px]" aria-hidden />
                      <span>{t("リンクをコピー")}</span>
                    </button>
                    {post.isMine ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMoreOpen(false);
                          setDraftBody(post.body);
                          setEditing(true);
                        }}
                        className="flex h-11 w-full items-center gap-3 px-4 text-left active:bg-muted"
                      >
                        <Pencil className="h-[18px] w-[18px]" aria-hidden />
                        <span>{t("投稿を編集")}</span>
                      </button>
                    ) : null}
                    {post.isMine ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => { setMoreOpen(false); setConfirmDelete(true); }}
                        className="flex h-11 w-full items-center gap-3 px-4 text-left text-destructive active:bg-muted"
                      >
                        <Trash2 className="h-[18px] w-[18px]" aria-hidden />
                        <span>{t("投稿を削除")}</span>
                      </button>
                    ) : null}
                    {(canModerate ? (["mute", "block"] as const) : []).map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        role="menuitem"
                        onClick={() => { setMoreOpen(false); relate.mutate(kind); }}
                        className="flex h-11 w-full items-center gap-3 px-4 text-left active:bg-muted"
                      >
                        {kind === "mute" ? <VolumeX className="h-[18px] w-[18px]" aria-hidden /> : <Ban className="h-[18px] w-[18px]" aria-hidden />}
                        <span className="truncate">{t(kind === "mute" ? "ミュート" : "ブロック")} {post.handle}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
        {post.replyTo ? (
          <p className="text-[13px] text-muted-foreground">{t("返信先")} {parent ? parent.handle : t("投稿")}</p>
        ) : null}
        {editing ? (
          <div className="mt-1 space-y-2">
            <textarea
              value={draftBody}
              onChange={(event) => setDraftBody(event.target.value)}
              maxLength={400}
              rows={3}
              aria-label={t("投稿を編集")}
              autoFocus
              className="w-full resize-none rounded-2xl border border-border bg-background px-3 py-2 text-[15px] leading-5 outline-none focus:border-[#1D9BF0]"
            />
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[13px] ${draftLength > 70 ? "text-destructive" : draftLength >= 60 ? "text-orange-500" : "text-muted-foreground"}`}>{draftLength}/70</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="h-9 rounded-full border border-border px-4 text-[14px] font-bold"
                >
                  {t("キャンセル")}
                </button>
                <button
                  type="button"
                  disabled={saveEdit.isPending || draftLength === 0 || draftLength > 70}
                  onClick={() => saveEdit.mutate()}
                  className="h-9 rounded-full bg-[#1D9BF0] px-4 text-[14px] font-bold text-white disabled:opacity-50"
                >
                  {saveEdit.isPending ? t("保存中…") : t("保存")}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <Link to={`/post/${post.id}`} className="block"><TweetBody body={post.body} /></Link>
        )}
        {safeImage(post.imageUrl) ? (
          <img
            src={safeImage(post.imageUrl) ?? undefined}
            alt=""
            loading="lazy"
            className="mt-2 max-h-[420px] w-full rounded-2xl border border-border object-cover"
          />
        ) : null}
        <PostEditHistory post={post} />
        {post.poll ? <PollView postId={post.id} poll={post.poll} /> : null}
        {post.quoteOf ? <QuoteCard post={quoted} /> : null}
        <div className="mt-1 grid grid-cols-4 items-center text-muted-foreground">
          <button
            type="button"
            onClick={() => navigate(`/compose?reply=${post.id}`)}
            aria-label={t("返信")}
            className="-ml-2 flex h-9 w-fit items-center gap-1 rounded-full px-2 text-[13px] transition active:scale-90 hover:text-[#1D9BF0]"
          >
            <MessageCircle className="h-[16px] w-[16px]" />
            {replyCount > 0 ? <span className="tabular-nums">{replyCount}</span> : null}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={t("リポスト")}
              className={`-ml-2 flex h-9 w-fit items-center gap-1 rounded-full px-2 text-[13px] transition active:scale-90 ${reposted ? "text-[#00BA7C]" : "hover:text-[#00BA7C]"}`}
            >
              <Repeat2 className="h-[17px] w-[17px]" strokeWidth={reposted ? 2.6 : 2} />
              {repostCount > 0 ? <span className="tabular-nums">{repostCount}</span> : null}
            </button>
            {menuOpen ? (
              <>
                <button type="button" aria-label={t("閉じる")} className="fixed inset-0 z-20 cursor-default" onClick={() => setMenuOpen(false)} />
                <div role="menu" className="absolute bottom-9 left-[-8px] z-30 w-52 overflow-hidden rounded-2xl border border-border bg-background py-1 text-[15px] font-bold text-foreground shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); repost.mutate(!reposted); }}
                    className="flex h-11 w-full items-center gap-3 px-4 text-left active:bg-muted"
                  >
                    <Repeat2 className="h-[18px] w-[18px]" aria-hidden />
                    {reposted ? t("リポストを取り消す") : t("リポスト")}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); navigate(`/compose?quote=${post.id}`); }}
                    className="flex h-11 w-full items-center gap-3 px-4 text-left active:bg-muted"
                  >
                    <Quote className="h-[18px] w-[18px]" aria-hidden />
                    {t("引用")}
                  </button>
                </div>
              </>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => like.mutate(!liked)}
            aria-pressed={liked}
            aria-label={liked ? t("いいねを取り消す") : t("いいね")}
            className={`-ml-2 flex h-9 w-fit items-center gap-1 rounded-full px-2 text-[13px] transition active:scale-90 ${liked ? "text-[#F91880]" : "hover:text-[#F91880]"}`}
          >
            <Heart className="h-[16px] w-[16px]" fill={liked ? "#F91880" : "none"} />
            {likeCount > 0 ? <span className="tabular-nums">{likeCount}</span> : null}
          </button>
          <button
            type="button"
            onClick={() => void sharePost()}
            aria-label={t("共有")}
            className="-ml-2 flex h-9 w-fit items-center rounded-full px-2 transition active:scale-90 hover:text-[#1D9BF0]"
          >
            <Share className="h-[15px] w-[15px]" aria-hidden />
          </button>
        </div>
        {confirmDelete ? (
          <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 px-6" role="dialog" aria-modal="true" aria-label={t("投稿を削除しますか？")}>
            <div className="w-full max-w-[320px] space-y-3 rounded-2xl bg-background p-5 text-foreground shadow-lg">
              <p className="text-[17px] font-bold">{t("投稿を削除しますか？")}</p>
              <p className="text-[14px] text-muted-foreground">{t("この投稿への返信・いいね・リポスト・投票も一緒に削除されます。この操作は取り消せません。")}</p>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate()}
                  className="h-11 rounded-full bg-destructive text-[15px] font-bold text-destructive-foreground disabled:opacity-50"
                >
                  {remove.isPending ? t("削除中…") : t("削除する")}
                </button>
                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => setConfirmDelete(false)}
                  className="h-11 rounded-full border border-border text-[15px] font-bold"
                >
                  {t("キャンセル")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

/** 引用された投稿を小さなカードで見せる。 */
export function QuoteCard({ post }: { post?: Post }) {
  const explanation = useRef<HTMLDialogElement>(null);
  if (!post) {
    return (
      <>
        <button type="button" onClick={() => explanation.current?.showModal()} className="mt-2 min-h-11 w-full rounded-2xl border border-border px-3 py-3 text-left text-[14px] text-muted-foreground">
          {t("引用元の投稿は見つかりません")}
        </button>
        <dialog ref={explanation} aria-labelledby="quote-explanation-title" className="m-auto w-[calc(100%-48px)] max-w-[320px] rounded-2xl bg-background p-5 text-foreground shadow-lg backdrop:bg-black/40">
          <h2 id="quote-explanation-title" className="text-[17px] font-bold">{t("引用元の投稿について")}</h2>
          <p className="mt-3 text-[14px] text-muted-foreground">{t("引用元の投稿は、削除されたか、現在表示できないため見つかりません。この引用投稿の本文は引き続き表示されます。")}</p>
          <button type="button" onClick={() => explanation.current?.close()} className="mt-4 h-11 w-full rounded-full border border-border font-bold">{t("閉じる")}</button>
        </dialog>
      </>
    );
  }
  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-border px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[14px]">
        <Avatar initial={post.initial} index={post.avatarIndex} url={post.avatarUrl} size={18} />
        <span className="truncate font-bold">{post.authorName}</span>
        <span className="truncate text-muted-foreground">{post.handle}</span>
      </div>
      <p className="mt-1 whitespace-pre-wrap break-words text-[14px] leading-5">{post.body}</p>
      {safeImage(post.imageUrl) ? (
        <img src={safeImage(post.imageUrl) ?? undefined} alt="" loading="lazy" className="mt-2 max-h-48 w-full rounded-xl object-cover" />
      ) : null}
    </div>
  );
}

function TweetBody({ body }: { body: string }) {
  const parts: ReactNode[] = [];
  const pattern = /#[^\s#]+/g;
  let last = 0;
  for (const match of body.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(<span key={`t-${last}`}>{body.slice(last, index)}</span>);
    parts.push(<span key={`h-${index}`} className="text-[#1D9BF0]">{match[0]}</span>);
    last = index + match[0].length;
  }
  if (last < body.length) parts.push(<span key={`t-${last}`}>{body.slice(last)}</span>);
  return <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-5">{parts}</p>;
}

export function Avatar({ initial, index, url, size }: { initial: string; index: number; url?: string | null; size: number }) {
  const safe = safeAvatar(url);
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full text-[13px] font-semibold text-foreground/70"
      style={{ width: size, height: size, backgroundColor: avatarFills[Math.abs(index) % avatarFills.length] }}
      aria-hidden
    >
      {safe ? <img src={safe} alt="" className="h-full w-full object-cover" /> : initial}
    </span>
  );
}

function safeImage(url?: string | null): string | null {
  return safeAvatar(url);
}

function safeAvatar(url?: string | null): string | null {
  if (!url) return null;
  if (/^data:image\/(png|jpe?g|webp);base64,/.test(url)) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

export function tweetAge(iso: string, language: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (Number.isNaN(minutes)) return "";
  if (language === "ja") {
    if (minutes < 1) return "たった今";
    if (minutes < 60) return `${minutes}分`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}時間`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}日`;
  } else if (minutes < 1) {
    return "now";
  } else if (minutes < 60) {
    return `${minutes}m`;
  } else if (minutes < 1440) {
    return `${Math.floor(minutes / 60)}h`;
  } else if (minutes < 10080) {
    return `${Math.floor(minutes / 1440)}d`;
  }
  return new Date(iso).toLocaleDateString(language === "ja" ? "ja-JP" : undefined, { month: "short", day: "numeric" });
}

export function QuietNote({ message }: { message: string }) {
  return <p className="grid min-h-[50vh] place-items-center px-6 text-center text-[15px] text-muted-foreground">{t(message)}</p>;
}
