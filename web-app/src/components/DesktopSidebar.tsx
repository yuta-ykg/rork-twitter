import { useQuery } from "@tanstack/react-query";
import { Bell, House, Mail, Search, Settings, SquarePen, User } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Avatar } from "@/components/TweetFeed";
import { useAuth } from "@/hooks/authContext";
import { useOwnProfile } from "@/hooks/useOwnProfile";
import { t, useLanguage } from "@/lib/language";
import { fetchNotifications } from "@/lib/notifications";

const HIDDEN_PREFIXES: string[] = ["/login", "/auth/callback", "/compose"];

const items: { to: string; label: string; icon: typeof House; end?: boolean }[] = [
  { to: "/", label: "ホーム", icon: House, end: true },
  { to: "/search", label: "検索", icon: Search },
  { to: "/notifications", label: "通知", icon: Bell },
  { to: "/messages", label: "メッセージ", icon: Mail },
  { to: "/mine", label: "プロフィール", icon: User },
  { to: "/settings", label: "設定", icon: Settings },
];

/** デスクトップ幅（lg以上）だけに出る左サイドバー。モバイルでは何も描画しない。 */
export default function DesktopSidebar() {
  useLanguage();
  const { user } = useAuth();
  const location = useLocation();
  const own = useOwnProfile();
  const unread = useQuery<boolean>({
    queryKey: ["notifications-unread", user?.id],
    enabled: Boolean(user?.id),
    refetchInterval: 60000,
    queryFn: async () => (await fetchNotifications(user?.id ?? "")).some((item) => item.isNew),
  });
  if (!user || HIDDEN_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))) return null;

  return (
    <aside
      className="fixed bottom-0 top-0 z-20 hidden w-60 flex-col py-3 lg:flex left-[max(0px,calc(50vw-496px))]"
      aria-label={t("メインナビゲーション")}
    >
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex h-12 items-center gap-4 rounded-full px-4 text-[19px] transition hover:bg-black/5 active:bg-black/10 ${isActive ? "font-bold text-foreground" : "text-foreground/90"}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <Icon className="h-[26px] w-[26px]" strokeWidth={isActive ? 2.5 : 1.8} />
                    {item.to === "/notifications" && unread.data && !isActive ? (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-muted bg-[#1D9BF0]" aria-hidden />
                    ) : null}
                  </span>
                  {t(item.label)}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
      <Link
        to="/compose"
        className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full bg-[#1D9BF0] text-[16px] font-bold text-white shadow-[0_4px_12px_rgba(29,155,240,0.3)] transition hover:bg-[#1A8CD8] active:scale-[0.98]"
      >
        <SquarePen className="h-5 w-5" />
        {t("投稿する")}
      </Link>
      <Link to="/mine" className="mt-auto flex min-h-14 items-center gap-3 rounded-full p-2 transition hover:bg-black/5">
        <Avatar initial={own?.initial ?? "あ"} index={0} url={own?.avatar} size={40} />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-bold">{own?.name}</span>
          <span className="block truncate text-[14px] text-muted-foreground">{own?.handle}</span>
        </span>
      </Link>
    </aside>
  );
}
