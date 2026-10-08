import { useState } from "react";
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
  const [tab, setTab] = useState<"posts" | "reposts">("posts");
  const mine = (timeline.data ?? []).filter((post) => post.isMine);
  const reposted = (timeline.data ?? []).filter((post) => post.reposted);
  const profile = profileQuery.data;
  const name = profile?.name ?? own?.name ?? "";
  const handle = profile?.handle ? `@${profile.handle}` : own?.handle ?? "";
  return (
    <div className="min-h-dvh bg-muted text-foreground">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-background">
        <header className="sticky top-0 z-10 grid h-12 grid-cols-[44px_1fr_44px] items-center border-b border-border bg-background px-2">
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
              <Link to="/mine/edit" className="grid h-9 place-items-center rounded-full border border-input px-4 text-[14px] font-bold active:bg-muted">
                {t("プロフィールを編集")}
              </Link>
            ) : null}
          </div>
          <h2 className="mt-3 text-[20px] font-extrabold leading-6">{name}</h2>
          <p className="text-[15px] text-muted-foreground">{handle}</p>
          {profile?.bio ? <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-5">{profile.bio}</p> : null}
          <div className="mt-3 flex items-center gap-4 text-[14px] text-muted-foreground">
            {profile?.created_at ? (
              <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" aria-hidden />{joined(profile.created_at, language)}{t("から利用")}</span>
            ) : null}
            <span><b className="text-foreground">{mine.length}</b> {t("投稿")}</span>
          </div>
        </section>
        <div className="grid grid-cols-2 border-b border-t border-border" role="tablist">
          {([["posts", "投稿"], ["reposts", "リポスト"]] as const).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`relative h-12 text-[15px] active:bg-muted ${tab === key ? "font-bold text-foreground" : "text-muted-foreground"}`}
            >
              {t(label)}
              {tab === key ? <span className="absolute inset-x-1/4 bottom-0 h-1 rounded-full bg-[#1D9BF0]" /> : null}
            </button>
          ))}
        </div>
        {timeline.isLoading ? <p className="grid min-h-[40vh] place-items-center text-muted-foreground">{t("読み込み中…")}</p> : null}
        {timeline.data ? <TweetList posts={tab === "posts" ? mine : reposted} empty={tab === "posts" ? "まだ投稿がありません" : "まだリポストがありません"} /> : null}
      </div>
    </div>
  );
}
