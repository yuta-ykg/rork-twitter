import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft } from "lucide-react";
import { Avatar, TweetList, useTimeline } from "@/components/TweetFeed";
import { useAuth } from "@/hooks/authContext";
import { useOwnProfile } from "@/hooks/useOwnProfile";
import { t, useLanguage } from "@/lib/language";
import { fetchProfile } from "@/lib/profiles";

function joined(iso: string | null, lang: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(lang === "ja" ? "ja-JP" : undefined, { year: "numeric", month: "long" });
}

export default function MinePage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const own = useOwnProfile();
  const timeline = useTimeline();
  const profileQuery = useQuery({
    queryKey: ["fullProfile", user?.id],
    queryFn: async () => (user?.id ? await fetchProfile(user.id) : null),
    enabled: Boolean(user?.id),
  });
  const mine = (timeline.data ?? []).filter((post) => post.isMine);
  const profile = profileQuery.data;
  const name = profile?.name ?? own?.name ?? "";
  const handle = profile?.handle ? `@${profile.handle}` : own?.handle ?? "";
  return (
    <div className="min-h-dvh bg-[#F7F9F9] text-[#0F1419]">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-white">
        <header className="sticky top-0 z-10 grid h-12 grid-cols-[44px_1fr_44px] items-center border-b border-[#ECF0F2] bg-white px-2">
          <Link to="/" className="grid h-11 w-11 place-items-center" aria-label={t("ホーム")}>
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-center text-[17px] font-bold">{name}</h1>
          <span />
        </header>
        <section className="px-4 pb-4 pt-4">
          <div className="flex items-start justify-between">
            <Avatar initial={own?.initial ?? "あ"} index={0} url={own?.avatar} size={72} />
            {profile ? (
              <Link to="/mine/edit" className="grid h-9 place-items-center rounded-full border border-[#CFD9DE] px-4 text-[14px] font-bold active:bg-[#F7F9F9]">
                {t("プロフィールを編集")}
              </Link>
            ) : null}
          </div>
          <h2 className="mt-3 text-[20px] font-extrabold leading-6">{name}</h2>
          <p className="text-[15px] text-[#536471]">{handle}</p>
          {profile?.bio ? <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-5">{profile.bio}</p> : null}
          <div className="mt-3 flex items-center gap-4 text-[14px] text-[#536471]">
            {profile?.created_at ? (
              <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" aria-hidden />{joined(profile.created_at, language)}{t("から利用")}</span>
            ) : null}
            <span><b className="text-[#0F1419]">{mine.length}</b> {t("投稿")}</span>
          </div>
        </section>
        <div className="border-b border-t border-[#ECF0F2] py-3 text-center text-[15px] font-bold">{t("投稿")}</div>
        {timeline.isLoading ? <p className="grid min-h-[40vh] place-items-center text-[#536471]">{t("読み込み中…")}</p> : null}
        {timeline.data ? <TweetList posts={mine} empty="まだ投稿がありません" /> : null}
      </div>
    </div>
  );
}
