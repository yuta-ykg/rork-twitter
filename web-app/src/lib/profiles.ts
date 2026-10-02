import { isDevelopmentSession, localUser, readDevelopmentProfile, writeDevelopmentProfile } from "@/lib/development";
import { supabase } from "@/lib/supabase";

export type Profile = {
  id: string; name: string; handle: string | null; bio: string;
  avatar_url: string | null; created_at: string | null; post_count: number;
};
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
export async function ensureProfile(author: { id: string; email: string; name?: string; picture?: string }) {
  if (isDevelopmentSession()) return;
  const { error } = await supabase.rpc("ensure_profile", {
    expected_user_id: author.id, profile_email: author.email,
    profile_name: author.name ?? "ユーザー", profile_avatar: author.picture ?? "",
  });
  if (error) throw error;
}
export function validateProfile(name: string, handle: string, bio: string, avatar: string) {
  if (Array.from(name.trim()).length < 1 || Array.from(name.trim()).length > 40) return "表示名は1〜40文字で入力してください。";
  if (!/^[a-z0-9_]{3,25}$/.test(handle)) return "ユーザー名は小文字の英数字と_で3〜25文字にしてください。";
  if (Array.from(bio).length > 160) return "自己紹介は160文字以内で入力してください。";
  if (avatar) {
    try { const url = new URL(avatar); if (url.protocol !== "https:" || avatar.length > 2048) return "画像にはHTTPSのURLを指定してください。"; }
    catch { return "画像のURLを確認してください。"; }
  }
  return "";
}
export async function saveProfile(id: string, name: string, handle: string, bio: string, avatar: string): Promise<Profile> {
  const message = validateProfile(name, handle, bio, avatar);
  if (message) throw new Error(message);
  if (isDevelopmentSession()) {
    const profile = { ...readDevelopmentProfile(), id, name: name.trim(), handle, bio, avatar_url: avatar || null };
    writeDevelopmentProfile(profile);
    return profile;
  }
  const { data, error } = await supabase.rpc("save_profile", {
    expected_user_id: id, profile_name: name.trim(), profile_handle: handle,
    profile_bio: bio, profile_avatar: avatar,
  });
  if (error) {
    if (error.code === "23505") throw new Error("このユーザー名は既に使われています。");
    throw new Error("プロフィールを保存できませんでした。もう一度試してください。");
  }
  if (!data?.[0]) throw new Error("プロフィールが見つかりません。");
  return data[0];
}
