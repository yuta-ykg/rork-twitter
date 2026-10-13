import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Search, X } from "lucide-react";
import { useAuth } from "@/hooks/authContext";
import { fetchFollowingIds } from "@/lib/follows";
import { fetchProfiles, type Profile } from "@/lib/profiles";
import { Avatar } from "@/components/TweetFeed";
import { t } from "@/lib/language";

/** フォロー中のユーザー一覧。名前・ユーザーIDで絞り込める。 */
export default function FollowingPage() {
  const { user } = useAuth();
  const [term, setTerm] = useState<string>("");
  const list = useQuery<Profile[]>({
    queryKey: ["following-profiles", user?.id],
    enabled: !!user?.id,
    queryFn: async () => fetchProfiles(await fetchFollowingIds(user?.id ?? "")),
  });
  const filtered = useMemo<Profile[]>(() => {
    const q = term.trim().replace(/^@/, "").toLowerCase();
    const all = list.data ?? [];
    if (!q) return all;
    return all.filter((p) => p.name.toLowerCase().includes(q) || (p.handle ?? "").toLowerCase().includes(q));
  }, [list.data, term]);

  return (
    <div className="min-h-dvh bg-muted text-foreground">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-background">
        <header className="sticky top-0 z-10 border-b border-border bg-background px-2 pb-2">
          <div className="grid h-12 grid-cols-[44px_1fr_44px] items-center">
            <Link to="/mine" className="grid h-11 w-11 place-items-center" aria-label={t("戻る")}><ChevronLeft className="h-6 w-6" /></Link>
            <h1 className="text-center text-[17px] font-bold">{t("フォロー中")}</h1>
            <span />
          </div>
          <div className="relative mx-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={t("名前やIDで絞り込む")}
              aria-label={t("名前やIDで絞り込む")}
              autoCapitalize="none"
              className="h-11 w-full rounded-full bg-muted pl-9 pr-10 text-[16px] outline-none"
            />
            {term ? (
              <button type="button" onClick={() => setTerm("")} aria-label={t("クリア")} className="absolute right-0 top-0 grid h-11 w-11 place-items-center text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </header>
        {list.isLoading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{t("読み込み中…")}</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{term.trim() ? t("該当するユーザーがいません。") : t("まだ誰もフォローしていません。")}</p>
        ) : (
          <ul>
            {filtered.map((p) => (
              <li key={p.id} className="border-b border-border">
                <Link to={`/u/${p.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2 active:bg-muted">
                  <Avatar initial={Array.from(p.name)[0] ?? "?"} index={0} url={p.avatar_url} size={44} />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-bold">{p.name}</span>
                    {p.handle ? <span className="block truncate text-[14px] text-muted-foreground">@{p.handle}</span> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
