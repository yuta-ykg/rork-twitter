import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { TweetList, TweetShell, useTimeline } from "@/components/TweetFeed";
import { t, useLanguage } from "@/lib/language";

export default function SearchPage() {
  useLanguage();
  const timeline = useTimeline();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase();
  const posts = useMemo(() => {
    const source = timeline.data ?? [];
    if (!needle) return source;
    return source.filter((post) =>
      post.body.toLocaleLowerCase().includes(needle)
      || post.authorName.toLocaleLowerCase().includes(needle)
      || post.handle.toLocaleLowerCase().includes(needle));
  }, [timeline.data, needle]);

  return (
    <TweetShell title="検索" tab="search" showCompose>
      <label className="mx-4 my-2 flex h-10 items-center gap-2 rounded-full bg-muted px-3">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("キーワードで投稿を検索")}
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
        />
      </label>
      {timeline.isLoading ? <p className="grid min-h-[30vh] place-items-center text-muted-foreground">{t("読み込み中…")}</p> : null}
      {timeline.data ? <TweetList posts={posts} empty="該当する投稿がありません。" searching={needle.length > 0} /> : null}
    </TweetShell>
  );
}
