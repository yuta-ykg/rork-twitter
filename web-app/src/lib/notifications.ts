import { supabase } from "@/lib/supabase";

export type NotificationKind = "like" | "repost" | "reply" | "quote";

export type AppNotification = {
  kind: NotificationKind;
  actorId: string;
  postId: string;
  refPostId: string | null;
  body: string;
  createdAt: string;
  isNew: boolean;
};

export const NOTIFICATION_PAGE_SIZE = 30;

/** 自分の投稿へのいいね・リポスト・返信・引用を新しい順に1ページ分取る。`before`より古いものだけ返す。 */
export async function fetchNotifications(userId: string, before?: string | null): Promise<AppNotification[]> {
  const { data, error } = await supabase.rpc("get_notifications_page", {
    expected_user_id: userId,
    before_at: before ?? undefined,
    page_size: NOTIFICATION_PAGE_SIZE,
  });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    kind: row.kind as NotificationKind,
    actorId: row.actor_id,
    postId: row.post_id,
    refPostId: row.ref_post_id,
    body: row.body,
    createdAt: row.created_at,
    isNew: row.is_new,
  }));
}

/** ここまでを既読にする。 */
export async function markNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_notifications_read", { expected_user_id: userId });
  if (error) throw error;
}
