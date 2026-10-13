import { supabase } from "@/lib/supabase";

export type FollowInfo = {
  isFollowing: boolean;
  followsYou: boolean;
  followerCount: number;
  followingCount: number;
};

/** フォローを付け外しする。 */
export async function setFollow(targetId: string, active: boolean, userId: string): Promise<void> {
  const { error } = await supabase.rpc("set_follow", { target_user_id: targetId, active, expected_user_id: userId });
  if (error) throw error;
}

/** 対象ユーザーのフォロー状態と、フォロー／フォロワー数。 */
export async function fetchFollowInfo(targetId: string, userId: string): Promise<FollowInfo> {
  const { data, error } = await supabase.rpc("get_follow_info", { target_user_id: targetId, expected_user_id: userId });
  if (error) throw error;
  const row = data?.[0];
  return {
    isFollowing: row?.is_following ?? false,
    followsYou: row?.follows_you ?? false,
    followerCount: Number(row?.follower_count ?? 0),
    followingCount: Number(row?.following_count ?? 0),
  };
}

/** 自分がフォローしているユーザーID。 */
export async function fetchFollowingIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_following_ids", { expected_user_id: userId });
  if (error) throw error;
  return (data ?? []).map((row) => row.followee_id);
}
