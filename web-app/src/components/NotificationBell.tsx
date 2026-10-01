import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { t, useLanguage } from "@/lib/language";

export function NotificationBell() {
  useLanguage();
  const { unreadCount } = useNotifications();
  return <span className="relative inline-flex">
    <Bell className="h-5 w-5" aria-hidden />
    {unreadCount > 0 && <span className="absolute -right-3 -top-2 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] leading-4 text-white">
      <span aria-hidden>{unreadCount > 99 ? "99+" : unreadCount}</span>
      <span className="sr-only">{t("未読の通知")}: {unreadCount}</span>
    </span>}
  </span>;
}
