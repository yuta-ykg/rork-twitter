import { isDevelopmentSession, localUser, readDevelopmentPosts, writeDevelopmentPosts, readDevelopmentProfile } from "@/lib/development";
import { ensureProfile, fetchProfiles, type Profile } from "@/lib/profiles";
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
  parentId?: string | null;
  avatarUrl?: string | null;
  imageUrl?: string | null;
  likeCount?: number;
  liked?: boolean;
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
  image_url?: string | null;
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
    imageUrl: row.image_url ?? null,
  };
}

const MAX_IMAGE_SIDE = 1600;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** 画像を長辺1600px以内のJPEGに縮める。 */
async function shrinkImage(file: File): Promise<Blob> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) throw new Error("JPEG、PNG、WebPの画像を選んでください。");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("画像を処理できませんでした。");
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("画像を処理できませんでした。");
  return blob;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** ログイン中のユーザーに見える70字投稿を新しい順で返す。 */
export async function fetchPosts(userId?: string | null): Promise<Post[]> {
  if (isDevelopmentSession()) {
    const profile = readDevelopmentProfile();
    return sortTimeline(readDevelopmentPosts()).map((post) => ({
      ...post,
      authorName: profile.name,
      handle: `@${profile.handle}`,
      initial: Array.from(profile.name)[0] ?? "開",
      avatarUrl: profile.avatar_url,
    }));
  }
  const { data, error } = await supabase.rpc("get_visible_posts", { expected_user_id: userId ?? undefined });
  if (error) throw error;
  const posts = (data ?? []).map((row) => toPost(row, userId));
  if (posts.length === 0) return posts;
  const profiles = await fetchProfiles(posts.flatMap((post) => post.userId ? [post.userId] : [])).catch((): Profile[] => []);
  const profileById = new Map<string, Profile>(profiles.map((profile) => [profile.id, profile]));
  const likes = await supabase.rpc("get_post_likes", { post_ids: posts.map((post) => post.id) });
  const likeById = new Map<string, { count: number; liked: boolean }>(
    (likes.data ?? []).map((row) => [row.post_id, { count: Number(row.like_count), liked: row.is_liked }]),
  );
  return posts.map((post) => {
    const profile = post.userId ? profileById.get(post.userId) : undefined;
    const name = profile?.name ?? post.authorName;
    return {
      ...post,
      likeCount: likeById.get(post.id)?.count ?? 0,
      liked: likeById.get(post.id)?.liked ?? false,
      authorName: name,
      handle: profile?.handle ? `@${profile.handle}` : post.handle,
      initial: Array.from(name)[0] ?? post.initial,
      avatarUrl: profile?.avatar_url ?? null,
    };
  });
}

/** いいねを付け外しする。冪等で、サーバー側の件数を返す。 */
export async function setPostLike(postId: string, liked: boolean, userId: string): Promise<{ count: number; liked: boolean }> {
  if (isDevelopmentSession()) {
    let result = { count: 0, liked };
    writeDevelopmentPosts(readDevelopmentPosts().map((post) => {
      if (post.id !== postId) return post;
      const base = (post.likeCount ?? 0) - (post.liked ? 1 : 0);
      result = { count: base + (liked ? 1 : 0), liked };
      return { ...post, likeCount: result.count, liked };
    }));
    return result;
  }
  const { data, error } = await supabase.rpc("set_post_like", {
    target_post_id: postId,
    liked,
    expected_user_id: userId,
  });
  if (error || !data?.[0]) throw error ?? new Error("いいねできませんでした");
  return { count: Number(data[0].like_count), liked: data[0].is_liked };
}

/** 本文（70字まで）と任意の画像1枚で投稿を作る。 */
export async function insertPost(body: string, author: Author, image?: File | null): Promise<Post> {
  const trimmed = body.trim();
  if (!trimmed || Array.from(trimmed).length > MAX_CHARACTERS) throw new Error("投稿は1〜70文字で入力してください。");
  const blob = image ? await shrinkImage(image) : null;
  if (isDevelopmentSession()) {
    const profile = readDevelopmentProfile();
    const post: Post = {
      imageUrl: blob ? await blobToDataUrl(blob) : null,
      id: crypto.randomUUID(),
      userId: localUser().id,
      authorName: profile.name,
      handle: `@${profile.handle}`,
      initial: Array.from(profile.name)[0] ?? "開",
      body: trimmed,
      createdAt: new Date().toISOString(),
      isMine: true,
      avatarIndex: 0,
      avatarUrl: profile.avatar_url,
    };
    writeDevelopmentPosts([post, ...readDevelopmentPosts()]);
    return post;
  }
  await ensureProfile(author);
  let imageUrl: string | undefined;
  if (blob) {
    const path = `${author.id}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage.from("post-images").upload(path, blob, { contentType: "image/jpeg" });
    if (uploadError) throw uploadError;
    imageUrl = supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
  }
  const { data, error } = await supabase.rpc("create_post", {
    post_id: crypto.randomUUID(),
    post_body: trimmed,
    expected_user_id: author.id,
    post_image_url: imageUrl,
  });
  if (error || !data?.[0]) throw error ?? new Error("投稿できませんでした");
  return toPost(data[0], author.id);
}

export function sortTimeline(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
