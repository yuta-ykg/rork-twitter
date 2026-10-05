import { PostDiagnosisCard } from "@/components/PostDiagnosisCard";
import { useAuth } from "@/hooks/authContext";
import { t, useLanguage } from "@/lib/language";
import { fetchPosts, setPostLike, sortTimeline, type Post } from "@/lib/posts";
import { Shell, Row, Avatar } from "@/pages/IndexShared";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";

type Category = "posts" | "users" | "diagnoses";
type RankedUser = {
  id: string;
  name: string;
  handle: string;
  initial: string;
  avatarIndex: number;
  profileId: string | null;
  likes: number;
  posts: number;
};
type RankedDiagnosis = { postId: string; diagnosis: NonNullable<Post["diagnosis"]>; shares: number };

const categories: Category[] = ["posts", "users", "diagnoses"];

export default function RankingsPage() {
  useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category>("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchPosts(user?.id)
      .then((next) => { if (!cancelled) setPosts(next); })
      .catch(() => { if (!cancelled) setError("投稿またはいいねを読み込めませんでした。"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id, retry]);

  const rankedPosts = useMemo(() => sortTimeline(posts).sort((a, b) =>
    (b.likeCount ?? 0) - (a.likeCount ?? 0) || b.createdAt.localeCompare(a.createdAt)).slice(0, 50), [posts]);

  const rankedUsers = useMemo(() => {
    const grouped = new Map<string, RankedUser>();
    for (const post of sortTimeline(posts)) {
      const key = post.userId ?? post.handle;
      const current = grouped.get(key);
      if (current) {
        current.likes += post.likeCount ?? 0;
        current.posts += 1;
      } else {
        grouped.set(key, {
          id: key,
          name: post.authorName,
          handle: post.handle,
          initial: post.initial,
          avatarIndex: post.avatarIndex,
          profileId: post.userId ?? null,
          likes: post.likeCount ?? 0,
          posts: 1,
        });
      }
    }
    return [...grouped.values()].sort((a, b) => b.likes - a.likes || b.posts - a.posts || a.name.localeCompare(b.name)).slice(0, 50);
  }, [posts]);

  const rankedDiagnoses = useMemo(() => {
    const grouped = new Map<string, RankedDiagnosis>();
    for (const post of sortTimeline(posts)) {
      const diagnosis = post.diagnosis;
      if (!diagnosis) continue;
      const current = grouped.get(diagnosis.id);
      if (current) {
        if (diagnosis.resultIndex !== null) current.shares += 1;
      } else {
        grouped.set(diagnosis.id, {
          postId: post.id,
          diagnosis: { ...diagnosis, resultIndex: null, result: null },
          shares: diagnosis.resultIndex === null ? 0 : 1,
        });
      }
    }
    return [...grouped.values()].sort((a, b) => b.shares - a.shares || a.diagnosis.title.localeCompare(b.diagnosis.title)).slice(0, 50);
  }, [posts]);

  const activeUser = useRef(user?.id);
  activeUser.current = user?.id;
  async function like(id: string) {
    if (!user) return;
    const post = posts.find((item) => item.id === id);
    if (!post) return;
    try {
      const state = await setPostLike(id, !post.isLiked, user.id);
      if (activeUser.current === user.id) setPosts((current) => current.map((item) => item.id === id ? { ...item, ...state } : item));
    } catch { toast.error(t("いいねを保存できませんでした。もう一度試してください。")); }
  }

  const description = category === "posts" ? "投稿ランキングはいいね数を基準にしています。"
    : category === "users" ? "ユーザーランキングは表示対象の投稿への合計いいね数を基準にしています。"
      : "診断ランキングは診断結果を共有した投稿数を基準にしています。";

  return (
    <Shell tab="rankings" onCompose={() => navigate("/", { state: { compose: true } })}>
      <div className="pt-4">
        <h1 className="text-[28px] font-bold">{t("ランキング")}</h1>
        <div className="mt-4 grid grid-cols-3 gap-1 rounded-full bg-muted p-1" role="tablist" aria-label={t("ランキング") }>
          {categories.map((item) => <button key={item} type="button" role="tab" aria-selected={category === item}
            onClick={() => setCategory(item)} className={`min-h-10 rounded-full px-2 text-sm font-medium transition ${category === item ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>
            {t(item === "posts" ? "投稿" : item === "users" ? "ユーザー" : "診断")}
          </button>)}
        </div>
        <p className="mt-3 px-1 text-sm text-muted-foreground">{t(description)}</p>
      </div>

      {loading ? <p role="status" className="py-10 text-center text-muted-foreground">{t("読み込み中…")}</p> : error ?
        <div className="py-10 text-center"><p role="alert" className="text-sm text-red-500">{t(error)}</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-3 min-h-11 rounded-full border border-input px-4 text-sm">{t("再読み込み")}</button></div> :
        category === "posts" ? rankedPosts.length ? rankedPosts.map((post, index) => <div key={post.id} className="flex items-start gap-2 border-b border-border">
          <span aria-label={`${t("順位")} ${index + 1}`} className="mt-5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">{index + 1}</span>
          <div className="min-w-0 flex-1"><Row post={post} showAuthor onLike={() => like(post.id)} /></div>
        </div>) : <p className="py-10 text-center text-muted-foreground">{t("ランキング対象の投稿がありません。")}</p> :
        category === "users" ? rankedUsers.length ? rankedUsers.map((rankedUser, index) => <div key={rankedUser.id} className="flex items-center gap-3 border-b border-border py-4">
          <span aria-label={`${t("順位")} ${index + 1}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">{index + 1}</span>
          {rankedUser.profileId ? <Link to={`/profile/${encodeURIComponent(rankedUser.profileId)}`} className="shrink-0" aria-label={rankedUser.name}>
            <Avatar initial={rankedUser.initial} index={rankedUser.avatarIndex} />
          </Link> : <Avatar initial={rankedUser.initial} index={rankedUser.avatarIndex} />}
          <div className="min-w-0 flex-1">
            {rankedUser.profileId ? <Link to={`/profile/${encodeURIComponent(rankedUser.profileId)}`} className="font-semibold hover:underline">{rankedUser.name}</Link> : <p className="font-semibold">{rankedUser.name}</p>}
            <p className="truncate text-sm text-muted-foreground">{rankedUser.handle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("いいね数")} {rankedUser.likes} · {t("投稿数")} {rankedUser.posts}</p>
          </div>
        </div>) : <p className="py-10 text-center text-muted-foreground">{t("ランキング対象のユーザーがいません。")}</p> :
        rankedDiagnoses.length ? rankedDiagnoses.map((entry, index) => <div key={entry.diagnosis.id} className="relative border-b border-border pb-3 pl-10">
          <span aria-label={`${t("順位")} ${index + 1}`} className="absolute left-0 top-5 grid h-8 w-8 place-items-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">{index + 1}</span>
          <PostDiagnosisCard diagnosis={entry.diagnosis} onShared={(post) => navigate(`/post/${post.id}`)} />
          <p className="mt-2 text-right text-xs text-muted-foreground">{t("結果共有数")} {entry.shares}</p>
        </div>) : <p className="py-10 text-center text-muted-foreground">{t("ランキング対象の診断がありません。")}</p>}
    </Shell>
  );
}
