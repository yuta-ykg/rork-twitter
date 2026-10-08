import { avatarFills, fetchPosts, setPostLike, setPostRepost, sortTimeline, type Post } from "@/lib/posts";
import { t, useLanguage } from "@/lib/language";
import { useAuth } from "@/hooks/authContext";
import { useOwnProfile } from "@/hooks/useOwnProfile";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronDown, Heart, House, Mail, MessageCircle, Quote, Repeat2, Search, Share, SquarePen } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
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

export function TweetShell({ title, tab, showCompose = false, children }: {
  title: string;
  tab: TabId;
  showCompose?: boolean;
  children: ReactNode;
}) {
  useLanguage();
  const own = useOwnProfile();
  return (
    <div className="min-h-dvh bg-[#F7F9F9] text-[#0F1419]">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-white">
        <header className="sticky top-0 z-10 grid h-12 grid-cols-[44px_1fr_44px] items-center border-b border-[#ECF0F2] bg-white px-3">
          <Link to="/mine" className="grid h-11 w-11 place-items-center" aria-label={t("自分の投稿")}>
            <Avatar initial={own?.initial ?? "あ"} index={0} url={own?.avatar} size={32} />
          </Link>
          <h1 className="text-center text-[17px] font-bold">{t(title)}</h1>
          <span />
        </header>
        <main className="flex-1">{children}</main>
        {showCompose ? (
          <Link
            to="/compose"
            aria-label={t("投稿する")}
            className="fixed bottom-[76px] right-[max(16px,calc(50vw-224px))] grid h-14 w-14 place-items-center rounded-full bg-[#1D9BF0] text-white shadow-[0_4px_12px_rgba(29,155,240,0.35)] transition active:scale-95"
          >
            <SquarePen className="h-[22px] w-[22px]" />
          </Link>
        ) : null}
        <nav className="sticky bottom-0 z-10 border-t border-[#ECF0F2] bg-white pb-[env(safe-area-inset-bottom)]" aria-label={t("メインナビゲーション")}>
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
                  <Icon className="h-[22px] w-[22px]" strokeWidth={selected ? 2.4 : 1.8} color={selected ? "#1D9BF0" : "#536471"} />
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
        {searching ? null : <p className="mt-2 text-sm text-[#536471]">{t("70字以内で、いまの気持ちを残しましょう。")}</p>}
      </div>
    );
  }
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id} className="border-b border-[#ECF0F2]">
          <TweetRow post={post} />
        </li>
      ))}
    </ul>
  );
}

export function TweetRow({ post }: { post: Post }) {
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
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
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
    <article className="flex gap-2.5 px-4 py-3" aria-label={`${post.authorName} ${post.handle}. ${post.body}`}>
      <Avatar initial={post.initial} index={post.avatarIndex} url={post.avatarUrl} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1 text-[15px]">
          <span className="truncate font-bold">{post.authorName}</span>
          <span className="truncate text-[#536471]">{post.handle}</span>
          <span className="text-[#536471]">·</span>
          <span className="shrink-0 text-[#536471]">{tweetAge(post.createdAt, language)}</span>
          <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-[#536471]" aria-hidden />
        </div>
        <TweetBody body={post.body} />
        {safeImage(post.imageUrl) ? (
          <img
            src={safeImage(post.imageUrl) ?? undefined}
            alt=""
            loading="lazy"
            className="mt-2 max-h-[420px] w-full rounded-2xl border border-[#ECF0F2] object-cover"
          />
        ) : null}
        {post.quoteOf ? <QuoteCard post={quoted} /> : null}
        <div className="mt-1 grid grid-cols-4 items-center text-[#536471]">
          <MessageCircle className="h-[15px] w-[15px]" aria-hidden />
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
                <div role="menu" className="absolute bottom-9 left-[-8px] z-30 w-52 overflow-hidden rounded-2xl border border-[#ECF0F2] bg-white py-1 text-[15px] font-bold text-[#0F1419] shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); repost.mutate(!reposted); }}
                    className="flex h-11 w-full items-center gap-3 px-4 text-left active:bg-[#F7F9F9]"
                  >
                    <Repeat2 className="h-[18px] w-[18px]" aria-hidden />
                    {reposted ? t("リポストを取り消す") : t("リポスト")}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); navigate(`/compose?quote=${post.id}`); }}
                    className="flex h-11 w-full items-center gap-3 px-4 text-left active:bg-[#F7F9F9]"
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
          <Share className="h-[15px] w-[15px]" aria-hidden />
        </div>
      </div>
    </article>
  );
}

/** 引用された投稿を小さなカードで見せる。 */
export function QuoteCard({ post }: { post?: Post }) {
  if (!post) {
    return (
      <div className="mt-2 rounded-2xl border border-[#ECF0F2] px-3 py-3 text-[14px] text-[#536471]">
        {t("引用元の投稿は見つかりません")}
      </div>
    );
  }
  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-[#ECF0F2] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[14px]">
        <Avatar initial={post.initial} index={post.avatarIndex} url={post.avatarUrl} size={18} />
        <span className="truncate font-bold">{post.authorName}</span>
        <span className="truncate text-[#536471]">{post.handle}</span>
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
      className="grid shrink-0 place-items-center overflow-hidden rounded-full text-[13px] font-semibold text-[#0F1419]/70"
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
  return <p className="grid min-h-[50vh] place-items-center px-6 text-center text-[15px] text-[#536471]">{t(message)}</p>;
}
