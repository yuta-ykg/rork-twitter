import { getLanguage, t } from "@/lib/language";
import { developerUser, isDevelopmentSession, readDevelopmentPosts, writeDevelopmentPosts, readDevelopmentProfile } from "@/lib/development";
import { ensureProfile, fetchProfile, fetchProfiles } from "@/lib/profiles";
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
  userId?: string | null;
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
    userId: row.user_id,
    isLiked: false,
    likeCount: 0,
  };
}

const postColumns = "id, author_name, handle, initial, body, created_at, avatar_index, user_id";

export async function fetchPosts(userId?: string | null): Promise<Post[]> {
  if (isDevelopmentSession()) {
    const profile = readDevelopmentProfile();
    return sortTimeline(readDevelopmentPosts()).map((post) => ({
      ...post, authorName: profile.name, handle: `@${profile.handle}`, initial: Array.from(profile.name)[0] ?? "開",
    }));
  }
  const { data, error } = await supabase.from("posts").select(postColumns).order("created_at", { ascending: false });
  if (error) throw error;
  const posts = (data ?? []).map((row) => toPost(row, userId));
  if (posts.length === 0) return posts;
  const { data: stats, error: likesError } = await supabase.rpc("get_post_likes", {
    post_ids: posts.map((post) => post.id),
  });
  if (likesError) throw likesError;
  const profiles = await fetchProfiles(posts.flatMap((post) => post.userId ? [post.userId] : []));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const byId = new Map((stats ?? []).map((stat) => [stat.post_id, stat]));
  return posts.map((post) => {
    const stat = byId.get(post.id);
    const profile = post.userId ? profileById.get(post.userId) : undefined;
    return { ...post,
      authorName: profile?.name ?? post.authorName,
      handle: profile?.handle ? `@${profile.handle}` : post.handle,
      initial: (profile?.name ?? post.authorName).slice(0, 1),
      likeCount: Number(stat?.like_count ?? 0), isLiked: Boolean(userId && stat?.is_liked) };
  });
}

export async function syncProfile(author: Author): Promise<void> {
  await ensureProfile(author);
}

export async function insertPost(body: string, author: Author): Promise<Post> {
  if (isDevelopmentSession()) {
    const trimmed = body.trim();
    if (!trimmed || Array.from(trimmed).length > MAX_CHARACTERS) throw new Error("投稿は1〜70文字で入力してください。");
    const profile = readDevelopmentProfile();
    const post: Post = { id: crypto.randomUUID(), userId: developerUser.id, authorName: profile.name,
      handle: `@${profile.handle}`, initial: Array.from(profile.name)[0] ?? "開", body: trimmed,
      createdAt: new Date().toISOString(), isMine: true, avatarIndex: 0, isLiked: false, likeCount: 0 };
    writeDevelopmentPosts([post, ...readDevelopmentPosts()]);
    return post;
  }
  const trimmed = body.trim();
  await syncProfile(author);
  const profile = await fetchProfile(author.id);
  const name = (profile?.name || author.name?.trim() || author.email || "あなた").slice(0, 40);
  const local = (author.email.split("@")[0] ?? "you").replace(/[^A-Za-z0-9_]/g, "");
  const handle = profile?.handle ? `@${profile.handle}` : `@${(local || "you").slice(0, 38)}`;
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
  const time = date.toLocaleTimeString(getLanguage() === "en" ? "en-US" : "ja-JP", { hour: "numeric", minute: "2-digit" });
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return `${t("今朝")} ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `${t("昨日")} ${time}`;
  return date.toLocaleString(getLanguage() === "en" ? "en-US" : "ja-JP", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export async function setPostLike(id: string, liked: boolean, userId: string) {
  if (isDevelopmentSession()) {
    if (userId !== developerUser.id) throw new Error("開発ユーザーが一致しません。");
    const posts = readDevelopmentPosts();
    const post = posts.find((item) => item.id === id);
    if (!post) throw new Error("投稿が見つかりません。");
    const state = { isLiked: liked, likeCount: liked ? 1 : 0 };
    writeDevelopmentPosts(posts.map((item) => item.id === id ? { ...item, ...state } : item));
    return state;
  }
  if (!userId) throw new Error("いいねするにはログインしてください。");
  const { data, error } = await supabase.rpc("set_post_like", {
    target_post_id: id, liked, expected_user_id: userId,
  });
  if (error) throw error;
  const stat = data?.[0];
  if (!stat) throw new Error("いいねを保存できませんでした。");
  return { isLiked: stat.is_liked, likeCount: Number(stat.like_count) };
}
