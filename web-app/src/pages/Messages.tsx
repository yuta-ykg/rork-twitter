import { QuietNote, TweetShell } from "@/components/TweetFeed";

export default function MessagesPage() {
  return (
    <TweetShell title="メッセージ" tab="messages">
      <QuietNote message="メッセージはありません" />
    </TweetShell>
  );
}
