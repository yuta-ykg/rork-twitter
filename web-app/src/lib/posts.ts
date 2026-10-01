import { supabase } from "@/lib/supabase";

export const MAX_CHARACTERS = 70;

export const avatarFills = ["#8ECAE6", "#CDB4DB", "#F4A6A6", "#95D5B2", "#E9C46A"] as const;

export type Post = {
  id: string;
  authorName: string;
  handle: string;
  initial: string;
  body: string;
  createdAt: string;
  isMine: boolean;
  avatarIndex: number;
  isLiked?: boolean;
  likeCount?: number;
};

type Row = {
  id: string;
  author_name: string;
  handle: string;
  initial: string;
  body: string;
  created_at: string;
  avatar_index: number;
  user_id: string | null;
};

export type Author = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
};

function toPost(row: Row, userId?: string | null): Post {
  return {
    id: row.id,
    authorName: row.author_name,
    handle: row.handle,
    initial: row.initial,
    body: row.body,
    createdAt: row.created_at,
    isMine: Boolean(userId) && row.user_id === userId,
    avatarIndex: row.avatar_index,
    isLiked: false,
    likeCount: 0,
  };
}

const postColumns = "id, author_name, handle, initial, body, created_at, avatar_index, user_id";

export async function fetchPosts(userId?: string | null): Promise<Post[]> {
  const { data, error } = await supabase.from("posts").select(postColumns).order("created_at", { ascending: false });
  if (error) throw error;
  const posts = (data ?? []).map((row) => toPost(row, userId));
  if (posts.length === 0) return posts;
  const { data: stats, error: likesError } = await supabase.rpc("get_post_likes", {
    post_ids: posts.map((post) => post.id),
  });
  if (likesError) throw likesError;
  const byId = new Map((stats ?? []).map((stat) => [stat.post_id, stat]));
  return posts.map((post) => {
    const stat = byId.get(post.id);
    return { ...post, likeCount: Number(stat?.like_count ?? 0), isLiked: Boolean(userId && stat?.is_liked) };
  });
}

export async function syncProfile(author: Author): Promise<void> {
  const { error } = await supabase.from("profiles").upsert(
    { id: author.id, email: author.email, name: author.name ?? null, avatar_url: author.picture ?? null },
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function insertPost(body: string, author: Author): Promise<Post> {
  const trimmed = body.trim();
  const name = (author.name?.trim() || author.email || "あなた").slice(0, 40);
  const local = (author.email.split("@")[0] ?? "you").replace(/[^A-Za-z0-9_]/g, "");
  const handle = `@${(local || "you").slice(0, 38)}`;
  await syncProfile(author);
  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_name: name,
      handle,
      initial: name.slice(0, 1),
      body: trimmed,
      is_mine: true,
      avatar_index: 0,
      user_id: author.id,
    })
    .select(postColumns)
    .single();
  if (error || !data) throw error ?? new Error("投稿できませんでした");
  return toPost(data, author.id);
}

export function sortTimeline(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function thisWeekCount(posts: Post[]): number {
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - mondayOffset);
  start.setHours(0, 0, 0, 0);
  return posts.filter((post) => post.isMine && new Date(post.createdAt) >= start).length;
}

export function timeLabel(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("ja-JP", { hour: "numeric", minute: "2-digit" });
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return `今朝 ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `昨日 ${time}`;
  return date.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export async function setPostLike(id: string, liked: boolean, userId: string) {
  if (!userId) throw new Error("いいねするにはログインしてください。");
  const { data, error } = await supabase.rpc("set_post_like", {
    target_post_id: id, liked, expected_user_id: userId,
  });
  if (error) throw error;
  const stat = data?.[0];
  if (!stat) throw new Error("いいねを保存できませんでした。");
  return { isLiked: stat.is_liked, likeCount: Number(stat.like_count) };
}
