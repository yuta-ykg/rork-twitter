import { t, useLanguage } from "@/lib/language";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/authContext";
import { displayName, userHandle } from "@/hooks/authUser";
import { fetchPosts, insertPost, sortTimeline, setPostLike, type Post } from "@/lib/posts";
import { Shell, Row, ComposeSheet } from "@/pages/IndexShared";
import { useOwnProfile } from "@/hooks/useOwnProfile";
import { isConsumerProtectionSearchQuery, isCrimePreventionSearchQuery, isSupportSearchQuery } from "@/lib/safetySearch";
import { SearchSupportNotice } from "@/components/SearchSupportNotice";
import { CrimePreventionNotice } from "@/components/CrimePreventionNotice";
import { ConsumerProtectionNotice } from "@/components/ConsumerProtectionNotice";

export default function SearchPage() {
  useLanguage();
  const { user } = useAuth();
  const own = useOwnProfile();
  const [posts, setPosts] = useState<Post[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError("");
    fetchPosts(user?.id)
      .then((next) => { if (!cancelled) setPosts(next); })
      .catch(() => { if (!cancelled) setError("タイムラインを読み込めませんでした。"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id, retry]);

  const keyword = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!keyword) return [];
    return sortTimeline(posts).filter((post) =>
      post.body.toLowerCase().includes(keyword)
      || post.authorName.toLowerCase().includes(keyword)
      || post.handle.toLowerCase().includes(keyword));
  }, [posts, keyword]);

  const activeUser = useRef(user?.id);
  activeUser.current = user?.id;
  async function like(id: string) {
    if (!user) { toast.error(t("いいねするにはAppleかGoogleでログインしてください。")); return; }
    const post = posts.find((item) => item.id === id);
    if (!post) return;
    const userId = user.id;
    try {
      const state = await setPostLike(id, !post.isLiked, userId);
      if (activeUser.current === userId) {
        setPosts((current) => current.map((item) => item.id === id ? { ...item, ...state } : item));
      }
    } catch { toast.error(t("いいねを保存できませんでした。もう一度試してください。")); }
  }
  async function add(body: string) {
    if (!user) return;
    try {
      const post = await insertPost(body, user);
      if (activeUser.current === user.id) setPosts((current) => [post, ...current]);
    } catch { toast.error(t("投稿できませんでした。もう一度試してください。")); }
  }

  return (
    <>
      <Shell tab="search" onCompose={() => setOpen(true)}>
        <div className="pt-4">
          <h1 className="text-[28px] font-bold">{t("検索")}</h1>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("キーワードで投稿を検索")}
              aria-label={t("検索")}
              className="h-11 w-full rounded-full border border-input bg-muted/60 pl-11 pr-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-[hsl(var(--brand))]"
            />
          </div>
        </div>
        {isSupportSearchQuery(query) ? <SearchSupportNotice /> : null}
        {isCrimePreventionSearchQuery(query) ? <CrimePreventionNotice /> : null}
        {isConsumerProtectionSearchQuery(query) ? <ConsumerProtectionNotice /> : null}
        {error ? <p role="alert" className="mt-4 text-sm text-red-500">{t(error)}</p> : null}
        {loading ? <p role="status" className="py-10 text-muted-foreground">{t("読み込み中…")}</p> :
          !keyword ? <p className="py-10 text-center text-muted-foreground">{t("ユーザー名や本文のキーワードで投稿を探せます。")}</p> :
          results.length ? results.map((post) => <Row key={post.id} post={post} showAuthor onLike={() => like(post.id)} />) :
          <p className="py-10 text-center text-muted-foreground">{t("該当する投稿がありません。")}</p>}
      </Shell>
      {open && user ? <ComposeSheet onClose={() => setOpen(false)} onPost={add}
        authorName={own?.name ?? displayName(user)} handle={own?.handle ?? userHandle(user)} initial={own?.initial ?? displayName(user).slice(0, 1)} /> : null}
    </>
  );
}

