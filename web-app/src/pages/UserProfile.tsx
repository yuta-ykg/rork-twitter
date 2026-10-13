import { Link, Navigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Avatar, TweetList, useTimeline } from "@/components/TweetFeed";
import { useAuth } from "@/hooks/authContext";
import { fetchFollowInfo, setFollow, type FollowInfo } from "@/lib/follows";
import { t, useLanguage } from "@/lib/language";
import { fetchProfile } from "@/lib/profiles";

export default function UserProfilePage() {
  const { id = "" } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const timeline = useTimeline();
  const profileQuery = useQuery({ queryKey: ["fullProfile", id], queryFn: () => fetchProfile(id), enabled: Boolean(id) });
  const infoKey = ["follow-info", user?.id, id];
  const info = useQuery<FollowInfo>({
    queryKey: infoKey,
    queryFn: () => fetchFollowInfo(id, user?.id ?? ""),
    enabled: Boolean(user?.id && id),
  });
  const toggle = useMutation({
    mutationFn: (next: boolean) => setFollow(id, next, user?.id ?? ""),
    onMutate: async (next: boolean) => {
      await queryClient.cancelQueries({ queryKey: infoKey });
      const previous = queryClient.getQueryData<FollowInfo>(infoKey);
      queryClient.setQueryData<FollowInfo>(infoKey, (current) => current && {
        ...current,
        isFollowing: next,
        followerCount: Math.max(0, current.followerCount + (next ? 1 : -1)),
      });
      return { previous };
    },
    onError: (_error, _next, context) => {
      if (context?.previous) queryClient.setQueryData(infoKey, context.previous);
      toast.error(t("フォローできませんでした。"));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["following-ids", user?.id] });
    },
  });

  if (user?.id && user.id === id) return <Navigate to="/mine" replace />;
  const profile = profileQuery.data;
  const posts = (timeline.data ?? []).filter((post) => post.userId === id && !post.replyTo);
  const name = profile?.name ?? posts[0]?.authorName ?? "";
  const handle = profile?.handle ? `@${profile.handle}` : posts[0]?.handle ?? "";
  const following = info.data?.isFollowing ?? false;
  return (
    <div className="min-h-dvh bg-muted text-foreground">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-background">
        <header className="sticky top-0 z-10 grid h-12 grid-cols-[44px_1fr_44px] items-center border-b border-border bg-background px-2">
          <button type="button" onClick={() => history.back()} className="grid h-11 w-11 place-items-center" aria-label={t("戻る")}>
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="truncate text-center text-[17px] font-bold">{name}</h1>
          <span />
        </header>
        <section className="px-4 pb-4 pt-4">
          <div className="flex items-start justify-between">
            <Avatar initial={Array.from(name)[0] ?? "?"} index={0} url={profile?.avatar_url} size={72} />
            <button
              type="button"
              disabled={!info.data || toggle.isPending}
              onClick={() => toggle.mutate(!following)}
              aria-pressed={following}
              className={`grid h-9 min-w-[96px] place-items-center rounded-full px-4 text-[14px] font-bold transition active:scale-95 disabled:opacity-60 ${following ? "border border-input text-foreground" : "bg-foreground text-background"}`}
            >
              {following ? t("フォロー中") : info.data?.followsYou ? t("フォローバック") : t("フォロー")}
            </button>
          </div>
          <h2 className="mt-3 text-[20px] font-extrabold leading-6">{name}</h2>
          <p className="flex items-center gap-2 text-[15px] text-muted-foreground">
            <span>{handle}</span>
            {info.data?.followsYou ? <span className="rounded bg-muted px-1.5 py-0.5 text-[12px]">{t("フォローされています")}</span> : null}
          </p>
          {profile?.bio ? <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-5">{profile.bio}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-muted-foreground">
            {profile?.created_at ? (
              <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" aria-hidden />{new Date(profile.created_at).toLocaleDateString(language === "ja" ? "ja-JP" : undefined, { year: "numeric", month: "long" })}{t("から利用")}</span>
            ) : null}
          </div>
          <div className="mt-2 flex items-center gap-4 text-[14px] text-muted-foreground">
            <span><b className="text-foreground">{info.data?.followingCount ?? 0}</b> {t("フォロー中")}</span>
            <span><b className="text-foreground">{info.data?.followerCount ?? 0}</b> {t("フォロワー")}</span>
          </div>
        </section>
        <div className="border-t border-border">
          {timeline.isLoading ? <p className="grid min-h-[30vh] place-items-center text-muted-foreground">{t("読み込み中…")}</p> : null}
          {timeline.data ? <TweetList posts={posts} empty="まだ投稿がありません" searching /> : null}
        </div>
        <Link to="/" className="sr-only">{t("ホーム")}</Link>
      </div>
    </div>
  );
}
