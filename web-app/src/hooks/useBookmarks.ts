import { useCallback, useEffect, useSyncExternalStore } from "react";
import { isDevelopmentSession } from "@/lib/development";
import { supabase } from "@/lib/supabase";

type Snapshot = { ids: string[]; loading: boolean; error: string; pendingIds: string[] };
type BookmarkRecord = {
  userId: string; development: boolean; key: string; snapshot: Snapshot;
  loaded: boolean; fetchedAt: number; listeners: Set<() => void>;
  flight?: Promise<void>; queue: Promise<void>;
};
const records = new Map<string, BookmarkRecord>();
const empty: Snapshot = { ids: [], loading: false, error: "", pendingIds: [] };
export function bookmarkKey(userId: string, development = isDevelopmentSession()) {
  return `iruka:bookmarks:${development ? "development" : "account"}:${encodeURIComponent(userId)}`;
}
export function parseBookmarkIds(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0))] : [];
  } catch { return []; }
}
function localIds(key: string): string[] {
  try { return parseBookmarkIds(localStorage.getItem(key) ?? ""); } catch { return []; }
}
function recordFor(userId: string, development: boolean): BookmarkRecord {
  const key = bookmarkKey(userId, development);
  let record = records.get(key);
  if (!record) {
    record = { userId, development, key,
      snapshot: { ids: development ? localIds(key) : [], loading: !development, error: "", pendingIds: [] },
      loaded: development, fetchedAt: 0, listeners: new Set(), queue: Promise.resolve() };
    records.set(key, record);
  }
  return record;
}
function update(record: BookmarkRecord, fields: Partial<Snapshot>) {
  record.snapshot = { ...record.snapshot, ...fields };
  record.listeners.forEach((listener) => listener());
}
async function load(record: BookmarkRecord): Promise<void> {
  if (record.flight) return record.flight;
  if (record.development) {
    update(record, { ids: localIds(record.key), loading: false, error: "" });
    return;
  }
  if (record.loaded && record.snapshot.pendingIds.length) return;
  update(record, { loading: !record.loaded, error: "" });
  record.flight = (async () => {
    try {
      const initial = await supabase.rpc("get_post_bookmarks", { expected_user_id: record.userId });
      if (initial.error) throw initial.error;
      let rows = initial.data ?? [];
      let legacy: string | null = null;
      try { legacy = localStorage.getItem(record.key); } catch { /* Server access still works. */ }
      const ids = parseBookmarkIds(legacy ?? "").filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
      // Import oldest batches first, retaining the original newest-first order.
      for (let end = ids.length; end > 0; end -= 500) {
        const result = await supabase.rpc("import_post_bookmarks", {
          expected_user_id: record.userId, post_ids: ids.slice(Math.max(0, end - 500), end),
        });
        if (result.error) throw result.error;
        rows = result.data ?? [];
      }
      // Remove legacy data only after every server request succeeds.
      if (legacy !== null) {
        try { if (localStorage.getItem(record.key) === legacy) localStorage.removeItem(record.key); } catch { /* Import is idempotent. */ }
      }
      record.loaded = true; record.fetchedAt = Date.now();
      update(record, { ids: rows.map((row) => row.post_id), loading: false, error: "" });
    } catch {
      update(record, { loading: false, error: "ブックマークを読み込めませんでした。" });
      throw new Error("ブックマークを読み込めませんでした。");
    } finally { record.flight = undefined; }
  })();
  return record.flight;
}
export async function setBookmark(userId: string, postId: string, saved: boolean) {
  if (!userId) throw new Error("ブックマークするにはログインしてください。");
  const record = recordFor(userId, isDevelopmentSession());
  if (record.snapshot.pendingIds.includes(postId)) return;
  update(record, { pendingIds: [...record.snapshot.pendingIds, postId] });
  const operation = record.queue.then(async () => {
    if (record.development) {
      const ids = localIds(record.key);
      const next = saved ? [postId, ...ids.filter((id) => id !== postId)] : ids.filter((id) => id !== postId);
      localStorage.setItem(record.key, JSON.stringify(next));
      update(record, { ids: next, error: "" });
      return;
    }
    if (record.flight) await record.flight;
    if (!record.loaded) await load(record);
    const { data, error } = await supabase.rpc("set_post_bookmark", {
      expected_user_id: userId, target_post_id: postId, saved,
    });
    if (error) throw new Error("ブックマークを保存できませんでした。");
    record.fetchedAt = Date.now();
    update(record, { ids: (data ?? []).map((row) => row.post_id), error: "" });
  });
  record.queue = operation.catch(() => {});
  try { await operation; }
  finally { update(record, { pendingIds: record.snapshot.pendingIds.filter((id) => id !== postId) }); }
}
export function useBookmarks(userId?: string) {
  const development = isDevelopmentSession();
  const record = userId ? recordFor(userId, development) : undefined;
  const subscribe = useCallback((listener: () => void) => {
    if (!record) return () => {};
    record.listeners.add(listener);
    return () => { record.listeners.delete(listener); };
  }, [record]);
  const getSnapshot = useCallback(() => record?.snapshot ?? empty, [record]);
  const state = useSyncExternalStore(subscribe, getSnapshot, () => empty);
  useEffect(() => {
    if (record && (!record.loaded || Date.now() - record.fetchedAt > 1000)) void load(record).catch(() => {});
  }, [record]);
  return { ...state, isBookmarked: (id: string) => state.ids.includes(id),
    refresh: () => record ? load(record) : Promise.resolve() };
}
function refreshActive() {
  if (document.visibilityState !== "visible") return;
  records.forEach((record) => { if (record.listeners.size) void load(record).catch(() => {}); });
}
if (typeof window !== "undefined") {
  window.addEventListener("focus", refreshActive);
  document.addEventListener("visibilitychange", refreshActive);
  window.setInterval(refreshActive, 30000);
  window.addEventListener("storage", (event) => {
    records.forEach((record) => {
      if (record.listeners.size && (event.key === null || event.key === record.key)) void load(record).catch(() => {});
    });
  });
}
