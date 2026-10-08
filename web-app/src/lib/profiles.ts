import { shrinkImage } from "@/lib/posts";
import { supabase } from "@/lib/supabase";

export type Profile = {
  id: string;
  name: string;
  handle: string | null;
  bio: string;
  avatar_url: string | null;
  created_at: string | null;
  post_count: number;
};

/** 投稿者の表示名とアイコンをまとめて取る。 */
export async function fetchProfiles(ids: string[]): Promise<Profile[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase.rpc("get_public_profiles", { profile_ids: [...new Set(ids)] });
  if (error) throw error;
  return data ?? [];
}

export async function fetchProfile(id: string): Promise<Profile | null> {
  return (await fetchProfiles([id]))[0] ?? null;
}

export const HANDLE_PATTERN = /^[a-z0-9_]{3,25}$/;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** 名前・ハンドル・自己紹介・アイコン画像を保存する。 */
export async function saveProfile(
  userId: string,
  input: { name: string; handle: string; bio: string; avatar?: File | null },
): Promise<Profile> {
  const blob = input.avatar ? await shrinkImage(input.avatar, 480) : null;
  let avatarUrl = "";
  if (blob) {
    const path = `${userId}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg" });
    if (uploadError) throw uploadError;
    avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }
  const { data, error } = await supabase.rpc("save_profile", {
    expected_user_id: userId,
    profile_name: input.name.trim(),
    profile_handle: input.handle,
    profile_bio: input.bio,
    profile_avatar: avatarUrl,
  });
  if (error) throw error;
  const row = (data as Profile[] | null)?.[0];
  if (!row) throw new Error("save failed");
  return row;
}

/** 投稿前に、ログイン中ユーザーのプロフィール行を用意する。 */
export async function ensureProfile(author: { id: string; email: string; name?: string; picture?: string }) {
  const { error } = await supabase.rpc("ensure_profile", {
    expected_user_id: author.id,
    profile_email: author.email,
    profile_name: author.name ?? "ユーザー",
    profile_avatar: author.picture ?? "",
  });
  if (error) throw error;
}
