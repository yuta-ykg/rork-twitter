import { useCallback, useMemo, useSyncExternalStore } from "react";
import { isDevelopmentSession } from "@/lib/development";

const listeners = new Set<() => void>();
function notify() { listeners.forEach((listener) => listener()); }
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === null || event.key.startsWith("iruka:bookmarks:")) notify();
  });
}
export function bookmarkKey(userId: string, development = isDevelopmentSession()) {
  return `iruka:bookmarks:${development ? "development" : "account"}:${encodeURIComponent(userId)}`;
}
function snapshot(userId?: string) {
  if (!userId) return "";
  try { return localStorage.getItem(bookmarkKey(userId)) ?? ""; } catch { return ""; }
}
export function parseBookmarkIds(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0))] : [];
  } catch { return []; }
}
export function setBookmark(userId: string, postId: string, saved: boolean) {
  if (!userId) throw new Error("ブックマークするにはログインしてください。");
  const ids = parseBookmarkIds(snapshot(userId));
  const next = saved ? [postId, ...ids.filter((id) => id !== postId)] : ids.filter((id) => id !== postId);
  localStorage.setItem(bookmarkKey(userId), JSON.stringify(next));
  notify();
}
export function useBookmarks(userId?: string) {
  const getSnapshot = useCallback(() => snapshot(userId), [userId]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => "");
  const ids = useMemo(() => parseBookmarkIds(raw), [raw]);
  return { ids, isBookmarked: (postId: string) => ids.includes(postId) };
}
