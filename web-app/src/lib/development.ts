import type { Post } from "@/lib/posts";
import type { Profile } from "@/lib/profiles";

export const canSkipLogin = import.meta.env.DEV || import.meta.env.EXPO_PUBLIC_ENABLE_DEV_LOGIN === "true";
export const GUEST_TTL_DAYS = 30;
const GUEST_TTL_MS = GUEST_TTL_DAYS * 24 * 60 * 60 * 1000;
export const developerUser = { id: "00000000-0000-4000-8000-000000000001", email: "developer@example.test", name: "開発ユーザー" };

type SessionRecord = { kind: "dev" | "guest"; startedAt: number; id: string };
const sessionKey = "iruka:development-session";
const postsKey = "iruka:development-posts";
const profileKey = "iruka:development-profile";

function readSession(): SessionRecord | null {
  try {
    const raw = localStorage.getItem(sessionKey);
    if (!raw) return null;
    if (raw === "true") return { kind: "dev", startedAt: Date.now(), id: developerUser.id };
    const parsed = JSON.parse(raw) as Partial<SessionRecord>;
    if ((parsed.kind === "dev" || parsed.kind === "guest") && typeof parsed.id === "string" && typeof parsed.startedAt === "number") {
      return parsed as SessionRecord;
    }
  } catch { /* Recover only local session data. */ }
  return null;
}
function writeSession(record: SessionRecord): void {
  localStorage.setItem(sessionKey, JSON.stringify(record));
}

/** True while any device-local session (developer preview or guest) is active. */
export function isDevelopmentSession(): boolean {
  return readSession() !== null;
}
export function isGuestSession(): boolean {
  return readSession()?.kind === "guest";
}
export function localUser(): { id: string; email: string; name: string } {
  const session = readSession();
  if (session?.kind === "guest") return { id: session.id, email: "guest@iruka.local", name: "ゲスト" };
  return developerUser;
}

export function startDevelopmentSession(): void {
  if (!canSkipLogin) return;
  writeSession({ kind: "dev", startedAt: Date.now(), id: developerUser.id });
}
/** Starts a device-local guest session; data is deleted after GUEST_TTL_DAYS unless carried over. */
export function startGuestSession(): { id: string; email: string; name: string } {
  clearLocalData();
  writeSession({ kind: "guest", startedAt: Date.now(), id: crypto.randomUUID() });
  return localUser();
}
export function endDevelopmentSession(): void {
  localStorage.removeItem(sessionKey);
}
/** Deletes device-local posts and profile data (guest sessions only). */
export function clearLocalData(): void {
  localStorage.removeItem(postsKey);
  localStorage.removeItem(profileKey);
}
/** Ends the guest session and deletes its data once the retention period (30 days) has passed. */
export function expireGuestSessionIfNeeded(): boolean {
  const session = readSession();
  if (session?.kind !== "guest") return false;
  if (Date.now() - session.startedAt < GUEST_TTL_MS) return false;
  endDevelopmentSession();
  clearLocalData();
  return true;
}

export function readDevelopmentPosts(): Post[] {
  try {
    const raw = localStorage.getItem(postsKey);
    if (raw) return JSON.parse(raw) as Post[];
  } catch { /* Recover only local data. */ }
  if (isGuestSession()) { writeDevelopmentPosts([]); return []; }
  const posts: Post[] = [{
    id: crypto.randomUUID(), userId: developerUser.id, authorName: "開発ユーザー",
    handle: "@developer", initial: "開", body: "開発用の投稿です。投稿・いいね・プロフィールを試せます。",
    createdAt: new Date().toISOString(), isMine: true, avatarIndex: 0, isLiked: false, likeCount: 0,
  }];
  writeDevelopmentPosts(posts);
  return posts;
}
export function writeDevelopmentPosts(posts: Post[]): void {
  if (!isDevelopmentSession()) throw new Error("ローカルセッションではありません。");
  localStorage.setItem(postsKey, JSON.stringify(posts));
}
export function readDevelopmentProfile(): Profile {
  let stored: Partial<Profile> | null = null;
  try { stored = JSON.parse(localStorage.getItem(profileKey) ?? "null"); } catch { /* Use defaults. */ }
  const guest = isGuestSession();
  return { name: guest ? "ゲスト" : "開発ユーザー", handle: guest ? "guest" : "developer",
    bio: guest ? "" : "開発用アカウント", avatar_url: null, created_at: new Date().toISOString(),
    ...stored, id: localUser().id, post_count: readDevelopmentPosts().length };
}
export function writeDevelopmentProfile(profile: Profile): void {
  if (!isDevelopmentSession() || profile.id !== localUser().id) throw new Error("ローカルセッションではありません。");
  localStorage.setItem(profileKey, JSON.stringify(profile));
}
