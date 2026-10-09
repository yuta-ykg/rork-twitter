import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Quote, Repeat2 } from "lucide-react";
import { Avatar, QuietNote, TweetShell, tweetAge } from "@/components/TweetFeed";
import { useAuth } from "@/hooks/authContext";
import { t, useLanguage } from "@/lib/language";
import { fetchNotifications, markNotificationsRead, type AppNotification, type NotificationKind } from "@/lib/notifications";
import { fetchProfiles, type Profile } from "@/lib/profiles";

const kindMeta: Record<NotificationKind, { icon: typeof Heart; color: string; label: string }> = {
  like: { icon: Heart, color: "#F91880", label: "があなたの投稿にいいねしました" },
  repost: { icon: Repeat2, color: "#00BA7C", label: "があなたの投稿をリポストしました" },
  reply: { icon: MessageCircle, color: "#1D9BF0", label: "があなたの投稿に返信しました" },
  quote: { icon: Quote, color: "#1D9BF0", label: "があなたの投稿を引用しました" },
};

type Loaded = { items: AppNotification[]; profiles: Map<string, Profile> };

export default function NotificationsPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery<Loaded>({
    queryKey: ["notifications", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const items = await fetchNotifications(user?.id ?? "");
      const profiles = await fetchProfiles(items.map((item) => item.actorId));
      return { items, profiles: new Map(profiles.map((profile) => [profile.id, profile])) };
    },
  });

  useEffect(() => {
    if (!user?.id || !query.data?.items.some((item) => item.isNew)) return;
    const timer = window.setTimeout(() => {
      void markNotificationsRead(user.id).then(() => queryClient.invalidateQueries({ queryKey: ["notifications-unread", user.id] }));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [query.data, user?.id, queryClient]);

  const items = query.data?.items ?? [];
  return (
    <TweetShell title="通知" tab="notifications" onRefresh={() => query.refetch()}>
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
            const actor = query.data?.profiles.get(item.actorId);
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
    </TweetShell>
  );
}
