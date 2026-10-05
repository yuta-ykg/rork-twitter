import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isDevelopmentSession } from "@/lib/development";
import { ensureProfile } from "@/lib/profiles";
import { supabase } from "@/lib/supabase";
import type { Author } from "@/lib/posts";
import type { ShogiAction, ShogiState } from "@/lib/shogi";

export type ShogiRoom = {
  id: string;
  room_key: string;
  sente_user_id: string;
  gote_user_id: string | null;
  game_state: ShogiState;
  revision: number;
  status: "waiting" | "playing";
  expires_at: string;
};

type ShogiRoomDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions"> & { Functions: Database["public"]["Functions"] & {
    create_shogi_room: { Args: { room_key: string; expected_user_id: string }; Returns: ShogiRoom };
    join_shogi_room: { Args: { target_room_key: string; expected_user_id: string }; Returns: ShogiRoom | null };
    get_shogi_room: { Args: { target_room_key: string; expected_user_id: string }; Returns: ShogiRoom | null };
    submit_shogi_move: { Args: { target_room_key: string; expected_revision: number; move_action: ShogiAction; next_state: ShogiState; expected_user_id: string }; Returns: ShogiRoom };
  } };
};

const client = supabase as unknown as SupabaseClient<ShogiRoomDatabase>;
const roomAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function requireOnlineAccount() {
  if (isDevelopmentSession()) throw new Error("オンライン対局にはログインが必要です。");
}

export function generateShogiRoomKey(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => roomAlphabet[byte % roomAlphabet.length]).join("");
}

export async function createShogiRoom(author: Author): Promise<ShogiRoom> {
  requireOnlineAccount();
  await ensureProfile(author);
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await client.rpc("create_shogi_room", {
      room_key: generateShogiRoomKey(), expected_user_id: author.id,
    });
    if (!error && data) return data;
    if (error?.code !== "23505" || attempt === 2) throw new Error("対局部屋を作成できませんでした。もう一度お試しください。");
  }
  throw new Error("対局部屋を作成できませんでした。もう一度お試しください。");
}

export async function joinShogiRoom(roomKey: string, author: Author): Promise<ShogiRoom> {
  requireOnlineAccount();
  await ensureProfile(author);
  const { data, error } = await client.rpc("join_shogi_room", {
    target_room_key: roomKey.trim().toUpperCase(), expected_user_id: author.id,
  });
  if (error) throw new Error(error.code === "55000" ? "この部屋は満員です。" : "部屋が見つからないか、参加できませんでした。");
  if (!data) throw new Error("部屋が見つからないか、有効期限が切れています。");
  return data;
}

export async function fetchShogiRoom(roomKey: string, userId: string): Promise<ShogiRoom | null> {
  requireOnlineAccount();
  const { data, error } = await client.rpc("get_shogi_room", {
    target_room_key: roomKey.trim().toUpperCase(), expected_user_id: userId,
  });
  if (error) throw new Error("対局部屋を読み込めませんでした。");
  return data;
}

export async function submitShogiMove(room: ShogiRoom, userId: string, action: ShogiAction, nextState: ShogiState): Promise<ShogiRoom> {
  requireOnlineAccount();
  const { data, error } = await client.rpc("submit_shogi_move", {
    target_room_key: room.room_key,
    expected_revision: room.revision,
    move_action: action,
    next_state: nextState,
    expected_user_id: userId,
  });
  if (error || !data) throw new Error(error?.code === "40001" ? "相手が先に指しました。盤面を更新します。" : "手を保存できませんでした。盤面を更新して再度お試しください。");
  return data;
}
