import { supabase } from "@/lib/supabase";

export const MAX_POLL_OPTIONS = 4;
export const MAX_POLL_OPTION_CHARS = 25;

export type Poll = {
  options: string[];
  counts: number[];
  endsAt: string;
  myVote: number | null;
};

type PollRow = { post_id: string; options: string[]; counts: number[]; ends_at: string; my_vote: number | null };

function toPoll(row: PollRow): Poll {
  return { options: row.options, counts: row.counts.map(Number), endsAt: row.ends_at, myVote: row.my_vote ?? null };
}

/** 投稿IDごとの投票状況を取得する。投票のない投稿は含まれない。 */
export async function fetchPolls(postIds: string[], userId?: string | null): Promise<Map<string, Poll>> {
  if (postIds.length === 0) return new Map();
  const { data, error } = await supabase.rpc("get_polls", { post_ids: postIds, expected_user_id: userId ?? undefined });
  if (error) throw error;
  return new Map<string, Poll>((data ?? []).map((row) => [row.post_id, toPoll(row)]));
}

/** 直前に作った自分の投稿に投票を付ける。 */
export async function createPoll(postId: string, options: string[], durationMinutes: number, userId: string): Promise<void> {
  const { error } = await supabase.rpc("create_poll", {
    target_post_id: postId,
    poll_options: options,
    duration_minutes: durationMinutes,
    expected_user_id: userId,
  });
  if (error) throw error;
}

/** 1アカウント1回だけ投票できる。更新後の投票状況を返す。 */
export async function votePoll(postId: string, optionIndex: number, userId: string): Promise<Poll> {
  const { data, error } = await supabase.rpc("vote_poll", {
    target_post_id: postId,
    option_index: optionIndex,
    expected_user_id: userId,
  });
  if (error || !data?.[0]) throw error ?? new Error("投票できませんでした");
  return toPoll(data[0]);
}
