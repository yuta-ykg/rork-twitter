import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { TweetRow, useTimeline } from "@/components/TweetFeed";
import { t, useLanguage } from "@/lib/language";
import { sortTimeline } from "@/lib/posts";

export default function PostDetailPage() {
  useLanguage();
  const { id } = useParams<{ id: string }>();
  const timeline = useTimeline();
  const all = timeline.data ?? [];
  const post = all.find((item) => item.id === id);
  const parent = post?.replyTo ? all.find((item) => item.id === post.replyTo) : undefined;
  const replies = sortTimeline(all.filter((item) => item.replyTo === id)).reverse();
  return (
    <div className="min-h-dvh bg-[#F7F9F9] text-[#0F1419]">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-white">
        <header className="sticky top-0 z-10 grid h-12 grid-cols-[44px_1fr_44px] items-center border-b border-[#ECF0F2] bg-white px-2">
          <Link to="/" className="grid h-11 w-11 place-items-center" aria-label={t("戻る")}>
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-center text-[17px] font-bold">{t("投稿")}</h1>
          <span />
        </header>
        {timeline.isLoading ? <p className="grid min-h-[40vh] place-items-center text-[#536471]">{t("読み込み中…")}</p> : null}
        {timeline.data && !post ? <p className="px-6 pt-16 text-center text-[#536471]">{t("投稿が見つかりません。")}</p> : null}
        {parent ? <div className="border-b border-[#ECF0F2] bg-[#F7F9F9]"><TweetRow post={parent} /></div> : null}
        {post ? <div className="border-b border-[#ECF0F2]"><TweetRow post={post} /></div> : null}
        {post ? (
          <>
            <ul>
              {replies.map((reply) => (
                <li key={reply.id} className="border-b border-[#ECF0F2]"><TweetRow post={reply} /></li>
              ))}
            </ul>
            {replies.length === 0 ? <p className="px-6 pt-10 text-center text-[15px] text-[#536471]">{t("まだ返信がありません")}</p> : null}
            <Link
              to={`/compose?reply=${post.id}`}
              className="sticky bottom-0 mt-auto flex h-14 items-center border-t border-[#ECF0F2] bg-white px-4 text-[15px] text-[#536471]"
            >
              {t("返信を投稿")}
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
