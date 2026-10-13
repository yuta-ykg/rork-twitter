import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, tweetAge } from "@/components/TweetFeed";
import { PollView } from "@/components/PollView";
import { t, useLanguage } from "@/lib/language";
import { fetchSharedPost, type Post } from "@/lib/posts";

function safeImage(url?: string | null): string | null {
  return url && /^https:\/\//.test(url) ? url : null;
}

function ReadOnlyRow({ post, language }: { post: Post; language: string }) {
  const image = safeImage(post.imageUrl);
  return (
    <article className="flex gap-2.5 px-4 py-3">
      <Avatar initial={post.initial} index={post.avatarIndex} url={post.avatarUrl} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1 text-[15px]">
          <span className="truncate font-bold">{post.authorName}</span>
          <span className="truncate text-muted-foreground">{post.handle}</span>
          <span className="text-muted-foreground">·</span>
          <span className="shrink-0 text-muted-foreground">{tweetAge(post.createdAt, language)}</span>
        </div>
        <Link to={`/post/${post.id}`} className="block whitespace-pre-wrap break-words text-[15px] leading-snug">{post.body}</Link>
        {image ? <img src={image} alt="" loading="lazy" className="mt-2 max-h-[420px] w-full rounded-2xl border border-border object-cover" /> : null}
        {post.poll ? <PollView postId={post.id} poll={post.poll} readOnly /> : null}
        {(post.likeCount ?? 0) > 0 ? (
          <p className="mt-2 flex items-center gap-1 text-[13px] text-muted-foreground">
            <Heart className="h-[14px] w-[14px]" aria-hidden />
            <span className="tabular-nums">{post.likeCount}</span>
          </p>
        ) : null}
      </div>
    </article>
  );
}

/** ログインなしで読める共有リンク用の投稿ページ。操作はログインへ誘導する。 */
export function SharedPostView({ postId }: { postId: string }) {
  const { language } = useLanguage();
  const query = useQuery({ queryKey: ["shared-post", postId], queryFn: () => fetchSharedPost(postId) });
  const shared = query.data;
  const loginState = { from: `/post/${postId}` };
  return (
    <div className="min-h-dvh bg-muted text-foreground">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-background">
        <header className="sticky top-0 z-10 grid h-12 grid-cols-[1fr_auto] items-center border-b border-border bg-background pl-4 pr-2">
          <h1 className="text-[17px] font-bold">{t("投稿")}</h1>
          <Link to="/login" state={loginState} className="grid h-11 place-items-center rounded-full px-4 text-[15px] font-bold text-[#1D9BF0]">
            {t("ログイン")}
          </Link>
        </header>
        {query.isLoading ? <p className="grid min-h-[40vh] place-items-center text-muted-foreground">{t("読み込み中…")}</p> : null}
        {query.isError ? <p className="px-6 pt-16 text-center text-muted-foreground">{t("投稿を読み込めませんでした。")}</p> : null}
        {!query.isLoading && !query.isError && !shared ? <p className="px-6 pt-16 text-center text-muted-foreground">{t("投稿が見つかりません。")}</p> : null}
        {shared?.parent ? <div className="border-b border-border bg-muted"><ReadOnlyRow post={shared.parent} language={language} /></div> : null}
        {shared ? <div className="border-b border-border"><ReadOnlyRow post={shared.post} language={language} /></div> : null}
        {shared?.quoted ? <div className="border-b border-border bg-muted"><ReadOnlyRow post={shared.quoted} language={language} /></div> : null}
        {shared ? (
          <>
            <ul>
              {shared.replies.map((reply) => (
                <li key={reply.id} className="border-b border-border"><ReadOnlyRow post={reply} language={language} /></li>
              ))}
            </ul>
            <div className="sticky bottom-0 mt-auto border-t border-border bg-background px-4 py-3">
              <p className="mb-2 text-center text-[13px] text-muted-foreground">{t("いいねや返信にはログインが必要です。")}</p>
              <Link to="/login" state={loginState} className="grid h-11 place-items-center rounded-full bg-[#1D9BF0] text-[15px] font-bold text-white active:opacity-80">
                {t("ログインして参加")}
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
