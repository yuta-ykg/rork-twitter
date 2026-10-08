import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { TweetList, useTimeline } from "@/components/TweetFeed";
import { t, useLanguage } from "@/lib/language";

export default function MinePage() {
  useLanguage();
  const timeline = useTimeline();
  const mine = (timeline.data ?? []).filter((post) => post.isMine);
  return (
    <div className="min-h-dvh bg-[#F7F9F9] text-[#0F1419]">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-white">
        <header className="sticky top-0 z-10 grid h-12 grid-cols-[44px_1fr_44px] items-center border-b border-[#ECF0F2] bg-white px-2">
          <Link to="/" className="grid h-11 w-11 place-items-center" aria-label={t("ホーム")}>
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-center text-[17px] font-bold">{t("自分の投稿")}</h1>
          <span />
        </header>
        {timeline.isLoading ? <p className="grid min-h-[40vh] place-items-center text-[#536471]">{t("読み込み中…")}</p> : null}
        {timeline.data ? <TweetList posts={mine} empty="まだ投稿がありません" /> : null}
      </div>
    </div>
  );
}
