import { supabase } from "@/lib/supabase";

export const MAX_SUB_ACCOUNTS = 5;

export interface SubAccount {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
}

interface SubRow {
  id: string;
  name: string;
  handle: string | null;
  avatar_url: string | null;
}

function toSub(row: SubRow): SubAccount {
  return { id: row.id, name: row.name, handle: row.handle, avatarUrl: row.avatar_url };
}

/** ログイン中のアカウントが持つサブアカウント一覧。 */
export async function listSubAccounts(): Promise<SubAccount[]> {
  const { data, error } = await supabase.rpc("list_sub_accounts");
  if (error) throw error;
  return (data ?? []).map(toSub);
}

export async function createSubAccount(name: string, handle: string): Promise<SubAccount> {
  const { data, error } = await supabase.rpc("create_sub_account", { sub_name: name, sub_handle: handle });
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error("create_sub_account returned no row");
  return toSub(row);
}

/** サブアカウントとその投稿・いいね等を削除する。 */
export async function deleteSubAccount(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_sub_account", { sub_id: id });
  if (error) throw error;
}
