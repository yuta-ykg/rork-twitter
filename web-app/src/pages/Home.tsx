import { TweetList, TweetShell, useTimeline } from "@/components/TweetFeed";
import { t } from "@/lib/language";

export default function HomePage() {
  const timeline = useTimeline();
  return (
    <TweetShell title="ホーム" tab="home" showCompose onRefresh={() => timeline.refetch({ throwOnError: true })}>
      {timeline.isLoading ? <p className="grid min-h-[40vh] place-items-center text-muted-foreground">{t("読み込み中…")}</p> : null}
      {timeline.isError ? <p className="px-6 pt-16 text-center text-sm text-red-500">{t("タイムラインを読み込めませんでした。")}</p> : null}
      {timeline.data ? <TweetList posts={timeline.data.filter((post) => !post.replyTo)} empty="まだ投稿がありません" /> : null}
    </TweetShell>
  );
}
