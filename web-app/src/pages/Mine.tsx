import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Check, ChevronDown, ChevronLeft, Repeat2 } from "lucide-react";
import { Avatar, TweetList, useTimeline } from "@/components/TweetFeed";
import { useAuth } from "@/hooks/authContext";
import { useOwnProfile } from "@/hooks/useOwnProfile";
import { t, useLanguage } from "@/lib/language";
import { fetchProfile } from "@/lib/profiles";

function joined(iso: string | null, lang: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(lang === "ja" ? "ja-JP" : undefined, { year: "numeric", month: "long" });
}

type SortKey = "new" | "old" | "likes" | "reposts" | "replies";
const SORTS: ReadonlyArray<readonly [SortKey, string]> = [
  ["new", "新しい順"],
  ["old", "古い順"],
  ["likes", "いいね数順"],
  ["reposts", "リポスト数順"],
  ["replies", "コメント数順"],
];

export default function MinePage() {
  const [sort, setSort] = useState<SortKey>("new");
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
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
  const replyCounts = new Map<string, number>();
  for (const item of timeline.data ?? []) {
    if (item.replyTo) replyCounts.set(item.replyTo, (replyCounts.get(item.replyTo) ?? 0) + 1);
  }
  const score = (post: { id: string; createdAt: string; likeCount?: number; repostCount?: number }): number => {
    if (sort === "likes") return post.likeCount ?? 0;
    if (sort === "reposts") return post.repostCount ?? 0;
    if (sort === "replies") return replyCounts.get(post.id) ?? 0;
    return 0;
  };
  const mine = (timeline.data ?? []).filter((post) => post.isMine).sort((a, b) => {
    if (sort === "new") return b.createdAt.localeCompare(a.createdAt);
    if (sort === "old") return a.createdAt.localeCompare(b.createdAt);
    return score(b) - score(a) || b.createdAt.localeCompare(a.createdAt);
  });
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
        <div className="relative grid grid-cols-2 border-b border-t border-border" role="tablist">
          {([["posts", "投稿"], ["reposts", "リポスト"]] as const).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              aria-haspopup={key === "posts" ? "menu" : undefined}
              aria-expanded={key === "posts" ? menuOpen : undefined}
              onClick={() => {
                if (key === "posts" && tab === "posts") setMenuOpen((open) => !open);
                else { setTab(key); setMenuOpen(false); }
              }}
              className={`relative flex h-12 items-center justify-center gap-1.5 text-[15px] active:bg-muted ${tab === key ? "font-bold text-foreground" : "text-muted-foreground"}`}
            >
              {key === "reposts" ? <Repeat2 className="h-[18px] w-[18px]" aria-hidden /> : null}
              {t(label)}
              {key === "posts" ? <ChevronDown className={`h-4 w-4 transition-transform ${menuOpen ? "rotate-180" : ""}`} aria-hidden /> : null}
              {tab === key ? <span className="absolute inset-x-1/4 bottom-0 h-1 rounded-full bg-[#1D9BF0]" /> : null}
            </button>
          ))}
          {menuOpen ? (
            <>
              <button type="button" aria-label={t("キャンセル")} className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} />
              <div role="menu" className="absolute left-2 top-[52px] z-20 w-48 overflow-hidden rounded-2xl border border-border bg-background py-1 shadow-lg">
                {SORTS.map(([key, label]) => (
                  <button
                    key={key}
                    role="menuitemradio"
                    aria-checked={sort === key}
                    onClick={() => { setSort(key); setMenuOpen(false); }}
                    className="flex h-11 w-full items-center justify-between px-4 text-[15px] active:bg-muted"
                  >
                    <span className={sort === key ? "font-bold" : ""}>{t(label)}</span>
                    {sort === key ? <Check className="h-4 w-4 text-[#1D9BF0]" aria-hidden /> : null}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
        {timeline.isLoading ? <p className="grid min-h-[40vh] place-items-center text-muted-foreground">{t("読み込み中…")}</p> : null}
        {timeline.data ? <TweetList posts={tab === "posts" ? mine : reposted} empty={tab === "posts" ? "まだ投稿がありません" : "まだリポストがありません"} /> : null}
      </div>
    </div>
  );
}
