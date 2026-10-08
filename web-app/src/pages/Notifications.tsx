import { QuietNote, TweetShell } from "@/components/TweetFeed";

export default function NotificationsPage() {
  return (
    <TweetShell title="通知" tab="notifications">
      <QuietNote message="通知はありません" />
    </TweetShell>
  );
}
