import { supabase } from "@/lib/supabase";
import { isDevelopmentSession, localUser, readDevelopmentPosts, readDevelopmentProfile } from "@/lib/development";

export type UserList = { id: string; name: string; member_count: number; created_at: string };
export type ListMember = { target_id: string; target_name: string | null; target_handle: string | null; is_blocked: boolean };
export type ListAccount = { id: string; name: string; handle: string | null };
type LocalList = UserList & { members: string[] };
const storageKey = (userId: string) => "iruka:user-lists:" + encodeURIComponent(userId);
function readLocal(userId: string): LocalList[] {
  try { return JSON.parse(localStorage.getItem(storageKey(userId)) ?? "[]") as LocalList[]; }
  catch { return []; }
}
function saveLocal(userId: string, rows: LocalList[]) {
  localStorage.setItem(storageKey(userId), JSON.stringify(rows));
}
function localList(userId: string, id: string): LocalList {
  const row = readLocal(userId).find((l) => l.id === id);
  if (!row) throw new Error("リストが見つかりません。");
  return row;
}
function localAccounts(): ListAccount[] {
  const profile = readDevelopmentProfile();
  const map = new Map<string, ListAccount>();
  for (const p of readDevelopmentPosts()) if (p.userId) map.set(p.userId, { id: p.userId, name: p.authorName, handle: p.handle.replace(/^@/, "") });
  map.set(localUser().id, { id: localUser().id, name: profile.name, handle: profile.handle });
  return [...map.values()];
}
export function validateListName(name: string): string {
  const trimmed = name.trim();
  if (Array.from(trimmed).length < 1 || Array.from(trimmed).length > 40) throw new Error("リスト名は1〜40文字で入力してください。");
  return trimmed;
}
export async function fetchUserLists(userId: string): Promise<UserList[]> {
  if (isDevelopmentSession()) return readLocal(userId).map((l) => ({ ...l, member_count: l.members.length }));
  const { data, error } = await supabase.rpc("get_user_lists", { expected_user_id: userId });
  if (error) throw error;
  return data ?? [];
}
export async function createUserList(userId: string, id: string, name: string) {
  name = validateListName(name);
  if (isDevelopmentSession()) {
    const rows = readLocal(userId);
    const existing = rows.find((l) => l.id === id);
    if (existing && existing.name !== name) throw new Error("リストを保存できませんでした。");
    if (!existing) saveLocal(userId, [{ id, name, member_count: 0, members: [], created_at: new Date().toISOString() }, ...rows]);
    return;
  }
  const { error } = await supabase.rpc("create_user_list", { target_list_id: id, list_name: name, expected_user_id: userId });
  if (error) throw error;
}
export async function renameUserList(userId: string, id: string, name: string) {
  name = validateListName(name);
  if (isDevelopmentSession()) { localList(userId, id); saveLocal(userId, readLocal(userId).map((l) => l.id === id ? { ...l, name } : l)); return; }
  const { error } = await supabase.rpc("rename_user_list", { target_list_id: id, list_name: name, expected_user_id: userId });
  if (error) throw error;
}
export async function deleteUserList(userId: string, id: string) {
  if (isDevelopmentSession()) { saveLocal(userId, readLocal(userId).filter((l) => l.id !== id)); return; }
  const { error } = await supabase.rpc("delete_user_list", { target_list_id: id, expected_user_id: userId });
  if (error) throw error;
}
export async function fetchListMembers(userId: string, id: string): Promise<ListMember[]> {
  if (isDevelopmentSession()) {
    const accounts = localAccounts();
    return localList(userId, id).members.map((target_id) => {
      const account = accounts.find((a) => a.id === target_id);
      return { target_id, target_name: account?.name ?? "ユーザー", target_handle: account?.handle ?? null, is_blocked: false };
    });
  }
  const { data, error } = await supabase.rpc("get_user_list_members", { target_list_id: id, expected_user_id: userId });
  if (error) throw error;
  return data ?? [];
}
export async function setListMember(userId: string, id: string, targetId: string, included: boolean) {
  if (isDevelopmentSession()) {
    localList(userId, id);
    saveLocal(userId, readLocal(userId).map((l) => l.id === id ? { ...l,
      members: included ? [...new Set([...l.members, targetId])] : l.members.filter((m) => m !== targetId) } : l));
    return;
  }
  const { error } = await supabase.rpc("set_user_list_member", { target_list_id: id, target_user_id: targetId, included, expected_user_id: userId });
  if (error) throw error;
}
export async function searchListAccounts(userId: string, query: string): Promise<ListAccount[]> {
  if (!query.trim()) return [];
  if (isDevelopmentSession()) {
    const needle = query.trim().replace(/^@/, "").toLowerCase();
    return localAccounts().filter((a) => a.name.toLowerCase().includes(needle) || a.handle?.toLowerCase().includes(needle));
  }
  const { data, error } = await supabase.rpc("search_list_accounts", { search_query: query.trim(), expected_user_id: userId });
  if (error) throw error;
  return data ?? [];
}

