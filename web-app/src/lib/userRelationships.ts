import { isDevelopmentSession } from "@/lib/development";
import { supabase } from "@/lib/supabase";

export type RelationKind = "mute" | "block";
export type UserRelationship = { target_id: string; kind: RelationKind; target_name: string; target_handle: string | null };
export type RelationshipState = { is_muted: boolean; is_blocked: boolean };
const key = (userId: string) => `iruka:relationships:${encodeURIComponent(userId)}`;
function local(userId: string): UserRelationship[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(key(userId)) ?? "[]");
    return Array.isArray(value) ? value.filter((r): r is UserRelationship => r && typeof r.target_id === "string" && (r.kind === "mute" || r.kind === "block")) : [];
  } catch { return []; }
}
export function hiddenDevelopmentUsers(userId?: string | null): Set<string> {
  return new Set(userId ? local(userId).map((row) => row.target_id) : []);
}
export async function listUserRelationships(userId: string): Promise<UserRelationship[]> {
  if (isDevelopmentSession()) return local(userId);
  const { data, error } = await supabase.rpc("list_user_relationships", { expected_user_id: userId });
  if (error) throw error;
  return data as UserRelationship[];
}
export async function getUserRelationship(userId: string, targetId: string): Promise<RelationshipState> {
  if (isDevelopmentSession()) { const rows = local(userId).filter((r) => r.target_id === targetId);
    return { is_muted: rows.some((r) => r.kind === "mute"), is_blocked: rows.some((r) => r.kind === "block") }; }
  const { data, error } = await supabase.rpc("get_user_relationship", { target_user_id: targetId, expected_user_id: userId });
  if (error) throw error;
  return data?.[0] ?? { is_muted: false, is_blocked: false };
}
export async function setUserRelationship(userId: string, targetId: string, kind: RelationKind, active: boolean): Promise<RelationshipState> {
  if (userId === targetId || !targetId) throw new Error("自分をミュート・ブロックできません。");
  if (isDevelopmentSession()) {
    const rows = local(userId).filter((r) => !(r.target_id === targetId && r.kind === kind));
    if (active) rows.push({ target_id: targetId, kind, target_name: targetId, target_handle: null });
    localStorage.setItem(key(userId), JSON.stringify(rows));
    return getUserRelationship(userId, targetId);
  }
  const { data, error } = await supabase.rpc("set_user_relationship", {
    target_user_id: targetId, relation_kind: kind, active, expected_user_id: userId,
  });
  if (error || !data?.[0]) throw error ?? new Error("設定を保存できませんでした。");
  return data[0];
}
