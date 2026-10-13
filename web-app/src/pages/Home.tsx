import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TweetList, TweetShell, useTimeline } from "@/components/TweetFeed";
import { useAuth } from "@/hooks/authContext";
import { fetchFollowingIds } from "@/lib/follows";
import { t } from "@/lib/language";

type FeedTab = "all" | "following";

export default function HomePage() {
  const timeline = useTimeline();
  const { user } = useAuth();
  const [tab, setTab] = useState<FeedTab>("all");
  const following = useQuery<string[]>({
    queryKey: ["following-ids", user?.id],
    queryFn: () => fetchFollowingIds(user?.id ?? ""),
    enabled: Boolean(user?.id),
  });
  const followedSet = new Set<string>(following.data ?? []);
  const base = (timeline.data ?? []).filter((post) => !post.replyTo);
  const posts = tab === "all" ? base : base.filter((post) => post.userId && followedSet.has(post.userId));
  return (
    <TweetShell title="ホーム" tab="home" showCompose onRefresh={() => Promise.all([timeline.refetch({ throwOnError: true }), following.refetch()])}>
      <div className="grid grid-cols-2 border-b border-border" role="tablist">
        {([["all", "おすすめ"], ["following", "フォロー中"]] as const).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`relative h-12 text-[15px] active:bg-muted ${tab === key ? "font-bold text-foreground" : "text-muted-foreground"}`}
          >
            {t(label)}
            {tab === key ? <span className="absolute inset-x-1/3 bottom-0 h-1 rounded-full bg-[#1D9BF0]" /> : null}
          </button>
        ))}
      </div>
      {timeline.isLoading ? <p className="grid min-h-[40vh] place-items-center text-muted-foreground">{t("読み込み中…")}</p> : null}
      {timeline.isError ? <p className="px-6 pt-16 text-center text-sm text-red-500">{t("タイムラインを読み込めませんでした。")}</p> : null}
      {timeline.data && tab === "following" && posts.length === 0 && !following.isLoading ? (
        <div className="px-7 pt-16 text-center">
          <p className="text-base font-semibold">{t("まだ投稿がありません")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("フォロー中のユーザーの投稿がここに表示されます。")}</p>
        </div>
      ) : null}
      {timeline.data && (tab === "all" || posts.length > 0) ? <TweetList posts={posts} empty="まだ投稿がありません" /> : null}
    </TweetShell>
  );
}
