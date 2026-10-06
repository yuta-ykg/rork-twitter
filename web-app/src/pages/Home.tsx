import { t, useLanguage } from "@/lib/language";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/authContext";
import { displayName } from "@/hooks/authUser";
import { avatarFills, fetchPosts, setPostLike, type Post } from "@/lib/posts";
import { rankTimeline, type TimelineMode } from "@/lib/recommendations";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Shell, Row } from "@/pages/IndexShared";
import { useOwnProfile } from "@/hooks/useOwnProfile";

const timelineModeKey = "iruka-timeline-mode";

function storedTimelineMode(): TimelineMode {
  try { return localStorage.getItem(timelineModeKey) === "latest" ? "latest" : "recommended"; }
  catch { return "recommended"; }
}

export default function HomePage() {
  useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const own = useOwnProfile();
  const [error, setError] = useState("");
  const { ids: bookmarkedIds } = useBookmarks(user?.id);
  const [timelineMode, setTimelineMode] = useState<TimelineMode>(storedTimelineMode);
  const timeline = useMemo(() => rankTimeline(posts, bookmarkedIds, timelineMode), [posts, bookmarkedIds, timelineMode]);

  function chooseTimelineMode(mode: TimelineMode) {
    setTimelineMode(mode);
    try { localStorage.setItem(timelineModeKey, mode); } catch { /* Keep the selected mode for this visit. */ }
  }

  useEffect(() => {
    let cancelled = false;
    fetchPosts(user?.id).then((next) => { if (!cancelled) setPosts(next); })
      .catch(() => { if (!cancelled) setError("タイムラインを読み込めませんでした。"); });
    return () => { cancelled = true; };
  }, [user?.id]);

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

  return (
    <Shell tab="home">
        {user ? (
          <button
            type="button"
            onClick={() => navigate("/compose")}
            className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-input px-4 py-3 text-left transition active:scale-[0.99]"
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-[rgba(15,20,25,0.7)]"
              style={{ backgroundColor: avatarFills[0] }}
              aria-hidden
            >
              {own?.initial ?? displayName(user).slice(0, 1)}
            </span>
            <span className="text-base text-muted-foreground">{t("いまどうしてる？")}</span>
          </button>
        ) : null}
        {error ? <p className="mb-2 text-sm text-red-500">{error}</p> : null}
        <section className="py-3" aria-label={t("タイムラインの表示順")}>
          <div className="grid grid-cols-2 rounded-full bg-muted p-1" role="group" aria-label={t("タイムラインの表示順")}>
            {(["recommended", "latest"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={timelineMode === mode}
                onClick={() => chooseTimelineMode(mode)}
                className={`min-h-10 rounded-full px-3 text-sm font-medium transition ${timelineMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {t(mode === "recommended" ? "おすすめ" : "新着順")}
              </button>
            ))}
          </div>
          {timelineMode === "recommended" ? (
            <p className="px-2 pt-2 text-xs text-muted-foreground">{t("いいね・ブックマーク・自分の投稿を手がかりに、話題の近い投稿を優先します。")}</p>
          ) : null}
        </section>
        {timeline.map((post) => (
          <Row key={post.id} post={post} showAuthor onLike={() => like(post.id)} />
        ))}
    </Shell>
  );
}
