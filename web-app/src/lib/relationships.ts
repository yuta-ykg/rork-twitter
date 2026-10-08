import { supabase } from "@/lib/supabase";

export type RelationKind = "mute" | "block";

export type Relationship = {
  targetId: string;
  kind: RelationKind;
  name: string;
  handle: string | null;
};

/** ミュート／ブロックを付け外しする。 */
export async function setRelationship(targetId: string, kind: RelationKind, active: boolean, userId: string): Promise<void> {
  const { error } = await supabase.rpc("set_user_relationship", {
    target_user_id: targetId,
    relation_kind: kind,
    active,
    expected_user_id: userId,
  });
  if (error) throw error;
}

/** 自分がミュート／ブロックしているアカウントの一覧。 */
export async function listRelationships(userId: string): Promise<Relationship[]> {
  const { data, error } = await supabase.rpc("list_user_relationships", { expected_user_id: userId });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    targetId: row.target_id,
    kind: row.kind === "block" ? "block" : "mute",
    name: row.target_name,
    handle: row.target_handle,
  }));
}
