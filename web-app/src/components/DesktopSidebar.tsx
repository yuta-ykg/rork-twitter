import { NotificationBell } from "@/components/NotificationBell";
import { Bookmark, List, Fish, Gamepad2, House, MoreHorizontal, Search, Settings, SquarePen, UserRound, UsersRound, Sparkles, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { t, useLanguage } from "@/lib/language";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function DesktopSidebar({ tab, onCompose }: { tab: "home" | "mine" | "bookmarks" | "settings" | "notifications" | "search" | "lists" | "communities" | "diagnoses" | "games" | "rankings"; onCompose: () => void }) {
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
          <Link to="/diagnoses" aria-current={tab === "diagnoses" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "diagnoses" ? "bg-muted text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <Sparkles className="h-5 w-5" aria-hidden />{t("診断を探す")}
          </Link>
          <Link to="/games" aria-current={tab === "games" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "games" ? "bg-muted text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <Gamepad2 className="h-5 w-5" aria-hidden />{t("ゲームセンター")}
          </Link>
          <Link to="/rankings" aria-current={tab === "rankings" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "rankings" ? "bg-muted text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
            <Trophy className="h-5 w-5" aria-hidden />{t("ランキング")}
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label={t("もっと見る")} aria-current={tab === "bookmarks" || tab === "communities" || tab === "lists" || tab === "mine" || tab === "notifications" || tab === "settings" ? "page" : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-xl px-3 ${tab === "bookmarks" || tab === "communities" || tab === "lists" || tab === "mine" || tab === "notifications" || tab === "settings" ? "bg-muted text-[hsl(var(--brand))]" : "text-muted-foreground"}`}>
                <MoreHorizontal className="h-5 w-5" aria-hidden />{t("もっと見る")}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-56">
              <DropdownMenuItem onSelect={onCompose} className="min-h-11 gap-3">
                <SquarePen className="h-5 w-5" aria-hidden />{t("投稿")}
              </DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/bookmarks" className="min-h-11 gap-3"><Bookmark className="h-5 w-5" aria-hidden />{t("ブックマーク")}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/communities" className="min-h-11 gap-3"><UsersRound className="h-5 w-5" aria-hidden />{t("コミュニティ")}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/lists" className="min-h-11 gap-3"><List className="h-5 w-5" aria-hidden />{t("リスト")}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/mine" className="min-h-11 gap-3"><UserRound className="h-5 w-5" aria-hidden />{t("自分")}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/notifications" className="min-h-11 gap-3"><NotificationBell />{t("通知")}</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/settings" className="min-h-11 gap-3"><Settings className="h-5 w-5" aria-hidden />{t("設定")}</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </aside>
  );
}
