import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Quote, Repeat2 } from "lucide-react";
import { Avatar, QuietNote, TweetShell, tweetAge } from "@/components/TweetFeed";
import { useAuth } from "@/hooks/authContext";
import { t, useLanguage } from "@/lib/language";
import { fetchNotifications, markNotificationsRead, NOTIFICATION_PAGE_SIZE, type AppNotification, type NotificationKind } from "@/lib/notifications";
import { fetchProfiles, type Profile } from "@/lib/profiles";

const kindMeta: Record<NotificationKind, { icon: typeof Heart; color: string; label: string }> = {
  like: { icon: Heart, color: "#F91880", label: "があなたの投稿にいいねしました" },
  repost: { icon: Repeat2, color: "#00BA7C", label: "があなたの投稿をリポストしました" },
  reply: { icon: MessageCircle, color: "#1D9BF0", label: "があなたの投稿に返信しました" },
  quote: { icon: Quote, color: "#1D9BF0", label: "があなたの投稿を引用しました" },
};

type Filter = "all" | "like" | "repost" | "reply";

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "like", label: "いいね" },
  { id: "repost", label: "リポスト" },
  { id: "reply", label: "返信・引用" },
];

function matches(filter: Filter, kind: NotificationKind): boolean {
  if (filter === "all") return true;
  if (filter === "reply") return kind === "reply" || kind === "quote";
  return kind === filter;
}

type Loaded = { items: AppNotification[]; profiles: Profile[] };

export default function NotificationsPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useInfiniteQuery<Loaded, Error, { pages: Loaded[] }, (string | undefined)[], string | null>({
    queryKey: ["notifications", user?.id],
    enabled: Boolean(user?.id),
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      const items = await fetchNotifications(user?.id ?? "", pageParam);
      const profiles = await fetchProfiles(items.map((item) => item.actorId));
      return { items, profiles };
    },
    getNextPageParam: (last) =>
      last.items.length >= NOTIFICATION_PAGE_SIZE ? last.items[last.items.length - 1]?.createdAt ?? null : null,
  });
  const pages = query.data?.pages ?? [];
  const profileById = new Map<string, Profile>(pages.flatMap((page) => page.profiles).map((profile) => [profile.id, profile]));
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const sentinel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
    }, { rootMargin: "400px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, query.data]);

  useEffect(() => {
    if (!user?.id || !pages.some((page) => page.items.some((item) => item.isNew))) return;
    const timer = window.setTimeout(() => {
      void markNotificationsRead(user.id).then(() => queryClient.invalidateQueries({ queryKey: ["notifications-unread", user.id] }));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [query.data, user?.id, queryClient]);

  const [filter, setFilter] = useState<Filter>("all");
  const all = pages.flatMap((page) => page.items);
  const items = all.filter((item) => matches(filter, item.kind));
  return (
    <TweetShell title="通知" tab="notifications" onRefresh={() => query.refetch()}>
      <div role="tablist" className="sticky top-0 z-10 flex border-b border-border bg-background">
        {filters.map((entry) => {
          const selected = entry.id === filter;
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setFilter(entry.id)}
              className="relative min-h-[48px] flex-1 px-1 text-[15px] active:bg-muted"
            >
              <span className={selected ? "font-bold text-foreground" : "font-medium text-muted-foreground"}>{t(entry.label)}</span>
              {selected ? <span className="absolute bottom-0 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-[#1D9BF0]" /> : null}
            </button>
          );
        })}
      </div>
      {query.isLoading ? (
        <p className="grid min-h-[50vh] place-items-center text-[15px] text-muted-foreground">{t("読み込み中…")}</p>
      ) : query.isError ? (
        <QuietNote message="通知を読み込めませんでした。" />
      ) : items.length === 0 ? (
        <QuietNote message="通知はありません" />
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item, index) => {
            const meta = kindMeta[item.kind];
            const Icon = meta.icon;
            const actor = profileById.get(item.actorId);
            const name = actor?.name ?? t("ユーザー");
            const target = item.refPostId ?? item.postId;
            return (
              <li key={`${item.kind}-${item.actorId}-${item.postId}-${item.createdAt}-${index}`}>
                <Link to={`/post/${target}`} className={`flex gap-3 px-4 py-3 active:bg-muted ${item.isNew ? "bg-[#1D9BF0]/5" : ""}`}>
                  <Icon className="mt-1 h-5 w-5 shrink-0" color={meta.color} fill={item.kind === "like" ? meta.color : "none"} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <Avatar initial={name.slice(0, 1)} index={0} url={actor?.avatar_url} size={32} />
                    <p className="mt-1 text-[15px]">
                      <span className="font-bold">{name}</span>
                      {t(meta.label)}
                      <span className="text-muted-foreground"> · {tweetAge(item.createdAt, language)}</span>
                    </p>
                    <p className="mt-0.5 line-clamp-2 break-words text-[15px] text-muted-foreground">{item.body}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {hasNextPage ? (
        <div ref={sentinel} className="grid h-14 place-items-center text-[13px] text-muted-foreground">
          {isFetchingNextPage ? t("読み込み中…") : null}
        </div>
      ) : null}
    </TweetShell>
  );
}
