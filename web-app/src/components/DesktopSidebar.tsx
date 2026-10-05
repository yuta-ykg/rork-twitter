import { NotificationBell } from "@/components/NotificationBell";
import { Bookmark, Fish, House, List, Search, Settings, SquarePen, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { t, useLanguage } from "@/lib/language";

export function DesktopSidebar({ tab, onCompose }: { tab: "home" | "mine" | "bookmarks" | "settings" | "notifications" | "search" | "lists"; onCompose: () => void }) {
  useLanguage();
  return (
    <aside className="fixed bottom-0 left-[calc(50%-380px)] top-0 hidden w-[220px] border-r border-border bg-background px-4 py-6 lg:block">
        <Link to="/" className="mb-8 inline-flex min-h-11 items-center px-3"><Fish className="h-[18px] w-[18px] text-[hsl(var(--brand))]" aria-hidden /><span className="ml-2 text-xl font-bold">{t("イルカ")}</span></Link>
        <nav aria-label={t("サイドナビゲーション")} className="flex flex-col gap-2">
          <Link to="/" aria-current={tab === "home" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "home" ? "bg-muted text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <House className="h-5 w-5" aria-hidden />{t("ホーム")}
          </Link>
          <Link to="/search" aria-current={tab === "search" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "search" ? "bg-muted text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <Search className="h-5 w-5" aria-hidden />{t("検索")}
          </Link>
          <button type="button" onClick={onCompose} aria-label={t("投稿を作成")} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-[hsl(var(--brand))]">
            <SquarePen className="h-5 w-5" aria-hidden />{t("投稿")}
          </button>
          <Link to="/bookmarks" aria-current={tab === "bookmarks" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "bookmarks" ? "bg-muted text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <Bookmark className="h-5 w-5" aria-hidden />{t("ブックマーク")}
          </Link>
          <Link to="/lists" aria-current={tab === "lists" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "lists" ? "bg-muted text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <List className="h-5 w-5" aria-hidden />{t("リスト")}
          </Link>
          <Link to="/mine" aria-current={tab === "mine" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "mine" ? "bg-muted text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <UserRound className="h-5 w-5" aria-hidden />{t("自分")}
          </Link>
          <Link to="/notifications" aria-current={tab === "notifications" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "notifications" ? "bg-muted text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <NotificationBell />{t("通知")}
          </Link>
          <Link to="/settings" aria-current={tab === "settings" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "settings" ? "bg-muted text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <Settings className="h-5 w-5" aria-hidden />{t("設定")}
          </Link>
        </nav>
      </aside>
  );
}

