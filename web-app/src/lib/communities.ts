import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/lib/supabase";
import { isDevelopmentSession } from "@/lib/development";
import { ensureProfile } from "@/lib/profiles";
import type { Author } from "@/lib/posts";

export type Community = { id: string; owner_id: string; name: string; description: string; member_count: number; is_member: boolean };
export type CommunityRole = "owner" | "moderator" | "member";
export type CommunityMember = { id: string; name: string; handle: string | null; status: "joined" | "removed"; is_owner: boolean; role: CommunityRole };
export type CommunityPost = { id: string; user_id: string; body: string; created_at: string; author_name: string; handle: string | null };
export type CommunitySnapshot = { community: Community; membership: "joined" | "removed" | null; role: CommunityRole | null; members: CommunityMember[]; posts: CommunityPost[]; has_more: boolean };
export type CommunityOperation = "create" | "update" | "delete" | "join" | "leave" | "promote" | "demote" | "remove" | "restore" | "post" | "delete_post";
type CommunityDatabase = Omit<Database, "public"> & { public: Omit<Database["public"], "Functions"> & { Functions: Database["public"]["Functions"] & {
  find_communities: { Args: { keyword: string; joined_only: boolean }; Returns: Community[] };
  get_community: { Args: { target_community_id: string; before_created_at?: string; before_id?: string }; Returns: CommunitySnapshot | null };
  manage_community: { Args: { expected_user_id: string; operation: string; target_community_id: string;
    community_name: string; community_description: string; target_user_id: string | null; target_post_id: string | null; post_body: string }; Returns: CommunitySnapshot | null };
} } };
const client = supabase as unknown as SupabaseClient<CommunityDatabase>;
export async function findCommunities(keyword = "", joinedOnly = false): Promise<Community[]> {
  if (isDevelopmentSession()) return [];
  const { data, error } = await client.rpc("find_communities", { keyword, joined_only: joinedOnly });
  if (error) throw new Error("コミュニティを読み込めませんでした。");
  return data ?? [];
}
export async function getCommunity(id: string, cursor?: CommunityPost): Promise<CommunitySnapshot | null> {
  if (isDevelopmentSession()) return null;
  const { data, error } = await client.rpc("get_community", { target_community_id: id,
    ...(cursor ? { before_created_at: cursor.created_at, before_id: cursor.id } : {}) });
  if (error) throw new Error("コミュニティを読み込めませんでした。");
  return data;
}
export function validateCommunity(name: string, description: string): void {
  if (!name.trim() || Array.from(name.trim()).length > 40 || Array.from(description).length > 160) {
    throw new Error("コミュニティ名は1〜40文字、説明は160文字以内で入力してください。");
  }
}
export async function manageCommunity(author: Author, operation: CommunityOperation, id: string,
  input: { name?: string; description?: string; memberId?: string; postId?: string; body?: string } = {}): Promise<CommunitySnapshot | null> {
  if (isDevelopmentSession()) throw new Error("コミュニティを利用するにはAppleかGoogleでログインしてください。");
  if (operation === "create" || operation === "update") validateCommunity(input.name ?? "", input.description ?? "");
  if (operation === "post" && (!input.body?.trim() || Array.from(input.body.trim()).length > 70)) throw new Error("投稿は1〜70文字で入力してください。");
  await ensureProfile(author);
  const { data, error } = await client.rpc("manage_community", { expected_user_id: author.id, operation, target_community_id: id,
    community_name: input.name ?? "", community_description: input.description ?? "", target_user_id: input.memberId ?? null,
    target_post_id: input.postId ?? null, post_body: input.body ?? "" });
  if (error) throw new Error("コミュニティの操作に失敗しました。再読み込みして参加状態を確認してください。");
  return data;
}
