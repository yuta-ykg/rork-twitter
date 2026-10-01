import type { Post } from "@/lib/posts";
import type { Profile } from "@/lib/profiles";

export const canSkipLogin = import.meta.env.DEV || import.meta.env.EXPO_PUBLIC_ENABLE_DEV_LOGIN === "true";
export const developerUser = { id: "00000000-0000-4000-8000-000000000001", email: "developer@example.test", name: "開発ユーザー" };
const sessionKey = "iruka:development-session";
const postsKey = "iruka:development-posts";
const profileKey = "iruka:development-profile";

export function isDevelopmentSession() {
  return canSkipLogin && localStorage.getItem(sessionKey) === "true";
}
export function startDevelopmentSession() {
  if (!canSkipLogin) return;
  localStorage.setItem(sessionKey, "true");
}
export function endDevelopmentSession() { localStorage.removeItem(sessionKey); }
export function readDevelopmentPosts(): Post[] {
  try {
    const raw = localStorage.getItem(postsKey);
    if (raw) return JSON.parse(raw);
  } catch { /* Recover only development data. */ }
  const posts: Post[] = [{
    id: crypto.randomUUID(), userId: developerUser.id, authorName: "開発ユーザー",
    handle: "@developer", initial: "開", body: "開発用の投稿です。投稿・いいね・プロフィールを試せます。",
    createdAt: new Date().toISOString(), isMine: true, avatarIndex: 0, isLiked: false, likeCount: 0,
  }];
  writeDevelopmentPosts(posts);
  return posts;
}
export function writeDevelopmentPosts(posts: Post[]) {
  if (!isDevelopmentSession()) throw new Error("開発セッションではありません。");
  localStorage.setItem(postsKey, JSON.stringify(posts));
}
export function readDevelopmentProfile(): Profile {
  let profile: Profile | null = null;
  try { profile = JSON.parse(localStorage.getItem(profileKey) ?? "null"); } catch { /* Use defaults. */ }
  return { id: developerUser.id, name: "開発ユーザー", handle: "developer",
    bio: "開発用アカウント", avatar_url: null, created_at: new Date().toISOString(),
    ...profile, post_count: readDevelopmentPosts().length };
}
export function writeDevelopmentProfile(profile: Profile) {
  if (!isDevelopmentSession() || profile.id !== developerUser.id) throw new Error("開発セッションではありません。");
  localStorage.setItem(profileKey, JSON.stringify(profile));
}
