import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { t, useLanguage } from "@/lib/language";
import { isDevelopmentSession, isGuestSession } from "@/lib/development";
import { toast } from "sonner";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/authContext";
import { displayName, userHandle } from "@/hooks/authUser";
import { insertPost, timeLabel } from "@/lib/posts";
import { Shell, ComposeSheet, SignInPanel } from "@/pages/IndexShared";
import { useOwnProfile } from "@/hooks/useOwnProfile";

export default function NotificationsPage() {
  useLanguage();
  const { user } = useAuth();
  const notifications = useNotifications();
  const own = useOwnProfile();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  async function add(body: string) {
    if (!user) return;
    try { const post = await insertPost(body, user); navigate(`/post/${post.id}`); }
    catch { toast.error(t("投稿できませんでした。もう一度試してください。")); }
  }
  async function openNotification(item: AppNotification) {
    try { await notifications.markRead(item); navigate(`/post/${item.post_id}`); }
    catch { toast.error(t("通知を既読にできませんでした。")); }
  }
  return <>
    <Shell tab="notifications" onCompose={() => setOpen(true)}>
      <div className="flex items-center justify-between gap-3 pt-4">
        <h1 className="text-[28px] font-bold">{t("通知")}</h1>
        {notifications.unreadCount > 0 && <button type="button" disabled={notifications.marking}
          onClick={() => void notifications.markAllRead().catch(() => toast.error(t("通知を既読にできませんでした。")))}
          className="min-h-11 text-sm text-[hsl(var(--brand))] disabled:opacity-50">{t("すべて既読にする")}</button>}
      </div>
      <p className="mb-4 mt-2 text-base text-muted-foreground">{t("自分の投稿へのいいねをお知らせします。")}</p>
      {!user ? <SignInPanel title={t("通知")} message={t("通知を見るにはログインしてください。")} /> :
        isDevelopmentSession() ? <p className="py-10 text-muted-foreground">{t(isGuestSession() ? "ゲストモードでは通知は届きません。" : "開発モードでは通知は届きません。")}</p> :
        notifications.loading ? <p role="status" className="py-10 text-muted-foreground">{t("読み込み中…")}</p> :
        notifications.error ? <div className="py-6"><p role="alert">{t("通知を読み込めませんでした。")}</p><button type="button" onClick={() => void notifications.refresh()} className="min-h-11 text-[hsl(var(--brand))]">{t("再読み込み")}</button></div> :
        notifications.rows.length ? <>
          {notifications.rows.map((item) => <button type="button" key={item.id} disabled={notifications.marking}
            onClick={() => void openNotification(item)}
            className={`flex min-h-20 w-full gap-3 border-b border-border px-3 py-4 text-left disabled:opacity-50 ${item.read_at ? "" : "bg-muted/60"}`}>
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--brand))]" style={{ opacity: item.read_at ? 0 : 1 }} aria-hidden />
            <span className="min-w-0">
              {!item.read_at && <span className="sr-only">{t("未読の通知")}: </span>}
              <span className="block font-medium">{item.is_grouped ? t("{count}人があなたの投稿にいいねしました。").replace("{count}", "20+") : t("{name}さんがいいねしました。").replace("{name}", item.actor_name ?? t("ユーザー"))}</span>
              <span className="mt-1 block break-words text-sm text-muted-foreground">{item.post_body}</span>
              <time dateTime={item.created_at} className="mt-2 block text-xs text-muted-foreground">{timeLabel(item.created_at)}</time>
            </span>
          </button>)}
          {notifications.hasMore && <button type="button" disabled={notifications.loadingMore} onClick={() => void notifications.loadMore()}
            className="min-h-11 w-full text-[hsl(var(--brand))]">{t("もっと見る")}</button>}
        </> : <p className="py-10 text-center text-muted-foreground">{t("まだ通知がありません。")}</p>}
    </Shell>
    {open && user ? <ComposeSheet onClose={() => setOpen(false)} onPost={add}
      authorName={own?.name ?? displayName(user)} handle={own?.handle ?? userHandle(user)} initial={own?.initial ?? displayName(user).slice(0, 1)} /> : null}
  </>;
}

