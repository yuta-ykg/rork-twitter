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
    if (/^data:image\/(png|jpe?g|webp);base64,/.test(avatar)) {
      if (avatar.length > 300000) return "画像のURLを確認してください。";
      return "";
    }
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

const AVATAR_SIZE = 256;

/** 画像を256pxの正方形JPEGに中心トリミングして軽量化する。 */
async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("画像をアップロードできませんでした。");
  const scale = Math.max(AVATAR_SIZE / bitmap.width, AVATAR_SIZE / bitmap.height);
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  context.drawImage(bitmap, (AVATAR_SIZE - width) / 2, (AVATAR_SIZE - height) / 2, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("画像をアップロードできませんでした。");
  return blob;
}

/** アイコン画像をアップロードする。ログイン時はSupabase Storage、ローカルセッション時は端末内に保存。 */
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("画像ファイルを選んでください。");
  if (file.size > 10 * 1024 * 1024) throw new Error("画像は10MBまでです。");
  const blob = await resizeImage(file);
  if (isDevelopmentSession()) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("画像をアップロードできませんでした。"));
      reader.readAsDataURL(blob);
    });
  }
  const path = `${userId}/avatar-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw new Error("画像をアップロードできませんでした。");
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}
