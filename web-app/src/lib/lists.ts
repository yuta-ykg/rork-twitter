import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isDevelopmentSession, localUser, readDevelopmentProfile } from "@/lib/development";
import { supabase } from "@/lib/supabase";
import type { Post } from "@/lib/posts";
import { updateLocalLists, type ListMember, type ListOperation, type UserList } from "./listModel";
export type { ListMember, UserList } from "./listModel";

// Migration-specific RPC types; regenerate the shared schema after applying SQL.
type ListsDatabase = Omit<Database, "public"> & { public: Omit<Database["public"], "Functions"> & {
  Functions: Database["public"]["Functions"] & {
    manage_user_lists: { Args: { expected_user_id: string; operation: string; target_list_id: string | null;
      list_name: string; list_description: string; target_user_id: string | null }; Returns: UserList[] };
    search_list_profiles: { Args: { expected_user_id: string; keyword: string }; Returns: ListMember[] };
    get_public_user_list: { Args: { target_list_id: string }; Returns: PublicListResponse | null };
    find_public_user_lists: { Args: { keyword: string }; Returns: Omit<UserList, "members">[] };
  };
} };
const client = supabase as unknown as SupabaseClient<ListsDatabase>;
type PublicPostRow = { id: string; author_name: string; handle: string; initial: string; body: string;
  created_at: string; avatar_index: number; user_id: string | null; parent_id: string | null };
type PublicListResponse = { list: UserList; posts: PublicPostRow[] };
export async function fetchPublicList(id: string): Promise<{ list: UserList; posts: Post[] } | null> {
  const { data, error } = await client.rpc("get_public_user_list", { target_list_id: id });
  if (error) throw new Error("公開リストを読み込めませんでした。");
  if (!data) return null;
  return { list: data.list, posts: data.posts.map((row) => ({ id: row.id, authorName: row.author_name,
    handle: row.handle, initial: row.initial, body: row.body, createdAt: row.created_at,
    avatarIndex: row.avatar_index, userId: row.user_id, parentId: row.parent_id, isMine: false })) };
}
export async function findPublicLists(keyword = ""): Promise<Omit<UserList, "members">[]> {
  const { data, error } = await client.rpc("find_public_user_lists", { keyword });
  if (error) throw new Error("公開リストを読み込めませんでした。");
  return data ?? [];
}
export function publicListUrl(id: string): string {
  return new URL(`/public/lists/${encodeURIComponent(id)}`, window.location.origin).href;
}
const localKey = (id: string) => `iruka:lists:${encodeURIComponent(id)}`;
function readLocal(userId: string): UserList[] {
  const value: unknown = JSON.parse(localStorage.getItem(localKey(userId)) ?? "[]");
  if (!Array.isArray(value) || !value.every((list) => list && typeof list.id === "string"
    && typeof list.name === "string" && typeof list.description === "string"
    && Array.isArray(list.members) && list.members.every((member: ListMember) => member
      && typeof member.id === "string" && typeof member.name === "string"
      && (member.handle === null || typeof member.handle === "string")))) {
    throw new Error("リストを読み込めませんでした。");
  }
  return value as UserList[];
}
export async function manageLists(userId: string, operation: ListOperation = "read", id = "",
  name = "", description = "", member?: ListMember): Promise<UserList[]> {
  if (isDevelopmentSession()) {
    if (userId !== localUser().id) throw new Error("ローカルユーザーが一致しません。");
    const next = updateLocalLists(readLocal(userId), operation, id, name, description, member);
    if (operation !== "read") localStorage.setItem(localKey(userId), JSON.stringify(next));
    return next;
  }
  const { data, error } = await client.rpc("manage_user_lists", { expected_user_id: userId, operation,
    target_list_id: id || null, list_name: name, list_description: description, target_user_id: member?.id ?? null });
  if (error) throw new Error("リストを保存・読み込みできませんでした。");
  return data ?? [];
}
export async function searchListProfiles(userId: string, keyword: string): Promise<ListMember[]> {
  if (!keyword.trim()) return [];
  if (isDevelopmentSession()) {
    const profile = readDevelopmentProfile();
    const query = keyword.trim().replace(/^@/, "").toLowerCase();
    return `${profile.name} ${profile.handle}`.toLowerCase().includes(query)
      ? [{ id: profile.id, name: profile.name, handle: profile.handle }] : [];
  }
  const { data, error } = await client.rpc("search_list_profiles", { expected_user_id: userId, keyword });
  if (error) throw new Error("ユーザーを検索できませんでした。");
  return data ?? [];
}
