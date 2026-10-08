import { isDevelopmentSession, localUser, readDevelopmentProfile, writeDevelopmentProfile } from "@/lib/development";
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
  if (isDevelopmentSession()) return ids.includes(localUser().id) ? [readDevelopmentProfile()] : [];
  if (!ids.length) return [];
  const { data, error } = await supabase.rpc("get_public_profiles", { profile_ids: [...new Set(ids)] });
  if (error) throw error;
  return data ?? [];
}

export async function fetchProfile(id: string): Promise<Profile | null> {
  return (await fetchProfiles([id]))[0] ?? null;
}

export const HANDLE_PATTERN = /^[a-z0-9_]{3,25}$/;

/** 名前・ハンドル・自己紹介を保存する。 */
export async function saveProfile(userId: string, input: { name: string; handle: string; bio: string }): Promise<Profile> {
  if (isDevelopmentSession()) {
    const next: Profile = { ...readDevelopmentProfile(), ...input };
    writeDevelopmentProfile(next);
    return next;
  }
  const { data, error } = await supabase.rpc("save_profile", {
    expected_user_id: userId,
    profile_name: input.name.trim(),
    profile_handle: input.handle,
    profile_bio: input.bio,
    profile_avatar: "",
  });
  if (error) throw error;
  const row = (data as Profile[] | null)?.[0];
  if (!row) throw new Error("save failed");
  return row;
}

/** 投稿前に、ログイン中ユーザーのプロフィール行を用意する。 */
export async function ensureProfile(author: { id: string; email: string; name?: string; picture?: string }) {
  if (isDevelopmentSession()) return;
  const { error } = await supabase.rpc("ensure_profile", {
    expected_user_id: author.id,
    profile_email: author.email,
    profile_name: author.name ?? "ユーザー",
    profile_avatar: author.picture ?? "",
  });
  if (error) throw error;
}
