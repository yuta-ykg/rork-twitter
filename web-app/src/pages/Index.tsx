import { Fish, Heart, House, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  MAX_CHARACTERS,
  avatarFills,
  fetchPosts,
  insertPost,
  sortTimeline,
  thisWeekCount,
  timeLabel,
  toggleLike,
  type Post,
} from "@/lib/posts";

type Tab = "home" | "mine";

function Avatar({ initial, index }: { initial: string; index: number }) {
  return (
    <span
      className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full text-base font-semibold text-[#0F1419]/70"
      style={{ backgroundColor: avatarFills[index % avatarFills.length] }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

function Wordmark() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xl font-bold text-[#0F1419]">
      <Fish className="h-[18px] w-[18px] text-[#1D9BF0]" aria-hidden />
      イルカ
    </span>
  );
}

function PostButton({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-[52px] w-full rounded-full bg-[#1D9BF0] text-[17px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function ComposeSheet({ onClose, onPost }: { onClose: () => void; onPost: (body: string) => void }) {
  const [draft, setDraft] = useState("");
  const count = draft.length;
  const canPost = draft.trim().length > 0 && count <= MAX_CHARACTERS;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 sm:items-center" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compose-title"
        className="flex max-h-[92dvh] w-full max-w-[430px] flex-col rounded-t-[28px] bg-white px-5 pb-6 pt-3 shadow-2xl sm:rounded-[28px]"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#ECF0F2]" />
        <div className="mb-4 flex items-center justify-between">
          <h2 id="compose-title" className="text-[17px] font-semibold text-[#0F1419]">
            新しい投稿
          </h2>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center text-[#536471]" aria-label="閉じる">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-4 flex items-center gap-3">
          <Avatar initial="あ" index={0} />
          <div>
            <p className="text-base font-semibold text-[#0F1419]">あなた</p>
            <p className="text-sm text-[#536471]">@you</p>
          </div>
        </div>
        <div className="relative min-h-[220px] rounded-2xl bg-[#F7F9F9]">
          {draft.length === 0 ? (
            <p className="pointer-events-none absolute left-3.5 top-4 text-[17px] text-[#536471]">今の気持ちを、70字まで。</p>
          ) : null}
          <textarea
            autoFocus
            value={draft}
            maxLength={MAX_CHARACTERS}
            onChange={(event) => setDraft(event.target.value.slice(0, MAX_CHARACTERS))}
            className="h-[220px] w-full resize-none bg-transparent p-3.5 text-[17px] text-[#0F1419] outline-none"
            aria-label="投稿本文"
          />
        </div>
        <p className={`mt-3 text-right font-mono text-[15px] ${count >= MAX_CHARACTERS ? "text-red-500" : "text-[#536471]"}`}>
          {count} / {MAX_CHARACTERS}
        </p>
        <div className="mt-4">
          <PostButton
            label="投稿する"
            disabled={!canPost}
            onClick={() => {
              if (!canPost) return;
              onPost(draft);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}

function Shell({
  tab,
  children,
  actionLabel,
  onCompose,
}: {
  tab: Tab;
  children: ReactNode;
  actionLabel: string;
  onCompose: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-white text-[#0F1419]">
      <header className="sticky top-0 z-10 border-b border-[#ECF0F2]/80 bg-white/75 px-5 py-3 backdrop-blur-xl">
        <Wordmark />
      </header>
      <main className="flex-1 px-5 pb-36">{children}</main>
      <div className="fixed bottom-0 left-1/2 z-20 w-full max-w-[430px] -translate-x-1/2">
        <div className="px-5 pb-2">
          <PostButton label={actionLabel} onClick={onCompose} />
        </div>
        <nav className="grid grid-cols-2 border-t border-white/40 bg-white/70 px-6 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
          <Link to="/" className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs ${tab === "home" ? "text-[#1D9BF0]" : "text-[#536471]"}`}>
            <House className="h-5 w-5" />
            ホーム
          </Link>
          <Link to="/mine" className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-xs ${tab === "mine" ? "text-[#1D9BF0]" : "text-[#536471]"}`}>
            <UserRound className="h-5 w-5" />
            自分
          </Link>
        </nav>
      </div>
    </div>
  );
}

function Row({ post, showAuthor, onLike }: { post: Post; showAuthor: boolean; onLike: () => void }) {
  return (
    <div className="border-b border-[#ECF0F2] py-3">
    <Link to={`/post/${post.id}`} className="flex gap-3">
      <Avatar initial={post.initial} index={post.avatarIndex} />
      <span className="min-w-0 pt-0.5">
        {showAuthor ? <span className="block text-base font-semibold">{post.authorName}</span> : null}
        <span className="block text-base leading-snug">{post.body}</span>
      </span>
    </Link>
    <div className="ml-[58px]"><LikeButton post={post} onClick={onLike} /></div>
    </div>
  );
}

function LikeButton({ post, onClick }: { post: Post; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-pressed={Boolean(post.isLiked)}
    aria-label={post.isLiked ? "いいねを取り消す" : "いいね"}
    className={`inline-flex min-h-11 min-w-11 items-center gap-2 rounded-full px-2 transition ${post.isLiked ? "text-pink-500" : "text-[#536471]"} hover:bg-pink-50`}>
    <Heart className="h-5 w-5" fill={post.isLiked ? "currentColor" : "none"} aria-hidden />
    <span>{post.likeCount ?? 0}</span>
  </button>;
}

export function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const timeline = useMemo(() => sortTimeline(posts), [posts]);

  useEffect(() => {
    fetchPosts().then(setPosts).catch(() => setError("タイムラインを読み込めませんでした。"));
  }, []);

  function like(id: string) {
    setPosts(toggleLike(posts, id));
  }

  async function add(body: string) {
    try {
      const next = await insertPost(body);
      setPosts((current) => [next, ...current]);
      setError("");
    } catch {
      setError("投稿できませんでした。もう一度試してください。");
    }
  }

  return (
    <>
      <Shell tab="home" actionLabel="投稿する" onCompose={() => setOpen(true)}>
        <h1 className="pt-4 text-[28px] font-bold leading-tight">いま、みんなが書いている</h1>
        <p className="mb-2 mt-1 text-base text-[#536471]">70字までの短い投稿</p>
        {error ? <p className="mb-2 text-sm text-red-500">{error}</p> : null}
        {timeline.map((post) => (
          <Row key={post.id} post={post} showAuthor onLike={() => like(post.id)} />
        ))}
      </Shell>
      {open ? <ComposeSheet onClose={() => setOpen(false)} onPost={add} /> : null}
    </>
  );
}

export function MinePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [open, setOpen] = useState(false);
  const mine = useMemo(() => sortTimeline(posts).filter((post) => post.isMine), [posts]);
  const count = thisWeekCount(posts);

  useEffect(() => {
    fetchPosts().then(setPosts).catch(() => undefined);
  }, []);

  function like(id: string) {
    setPosts(toggleLike(posts, id));
  }

  async function add(body: string) {
    const next = await insertPost(body);
    setPosts((current) => [next, ...current]);
  }

  return (
    <>
      <Shell tab="mine" actionLabel="新しく投稿" onCompose={() => setOpen(true)}>
        <div className="py-6 text-center">
          <p className="text-[56px] font-bold leading-none tabular-nums">{count}</p>
          <p className="mt-1 text-base text-[#536471]">今週の投稿</p>
        </div>
        {mine.length === 0 ? (
          <p className="py-10 text-center text-[#536471]">まだ投稿がありません</p>
        ) : (
          mine.map((post) => <Row key={post.id} post={post} showAuthor={false} onLike={() => like(post.id)} />)
        )}
      </Shell>
      {open ? <ComposeSheet onClose={() => setOpen(false)} onPost={add} /> : null}
    </>
  );
}

export function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [ready, setReady] = useState(false);
  const post = posts.find((item) => item.id === id);
  useEffect(() => {
    fetchPosts()
      .then(setPosts)
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);
  function like() {
    if (!id) return;
    setPosts(toggleLike(posts, id));
  }

  if (!ready) {
    return <div className="mx-auto min-h-dvh max-w-[430px] bg-white" />;
  }

  if (!post) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-white px-5 pt-6">
        <button type="button" onClick={() => navigate(-1)} className="mb-6 h-11 text-left text-[#1D9BF0]">
          戻る
        </button>
        <p className="text-[#536471]">投稿が見つかりません。</p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-white px-5 pb-10 text-[#0F1419]">
      <header className="sticky top-0 flex h-14 items-center bg-white/75 backdrop-blur-xl">
        <button type="button" onClick={() => navigate(-1)} className="h-11 pr-4 text-[#1D9BF0]">
          戻る
        </button>
        <span className="text-[17px] font-semibold">投稿</span>
      </header>
      <div className="mt-2 flex items-center gap-3">
        <Avatar initial={post.initial} index={post.avatarIndex} />
        <div>
          <p className="text-[17px] font-semibold">{post.authorName}</p>
          <p className="text-[15px] text-[#536471]">{post.handle}</p>
        </div>
      </div>
      <p className="mt-5 text-2xl font-semibold leading-snug">{post.body}</p>
      <div className="mt-3"><LikeButton post={post} onClick={like} /></div>
      <div className="mt-6 grid grid-cols-2 border-t border-[#ECF0F2] pt-4">
        <div>
          <p className="text-[13px] text-[#536471]">投稿時刻</p>
          <p className="mt-1 text-[17px] font-semibold">{timeLabel(post.createdAt)}</p>
        </div>
        <div className="border-l border-[#ECF0F2] pl-4">
          <p className="text-[13px] text-[#536471]">文字数</p>
          <p className="mt-1 text-[17px] font-semibold">{post.body.length}字</p>
        </div>
      </div>
    </div>
  );
}
