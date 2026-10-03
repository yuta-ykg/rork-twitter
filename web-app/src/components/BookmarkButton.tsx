import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/authContext";
import { setBookmark, useBookmarks } from "@/hooks/useBookmarks";
import { t, useLanguage } from "@/lib/language";

export function BookmarkButton({ postId }: { postId: string }) {
  useLanguage();
  const { user } = useAuth();
  const { isBookmarked, loading, pendingIds } = useBookmarks(user?.id);
  const saved = isBookmarked(postId);
  const label = t(saved ? "ブックマークを解除" : "ブックマークに追加");
  return <button type="button" aria-label={label} title={label} aria-pressed={saved} disabled={loading || pendingIds.includes(postId)} aria-busy={loading || pendingIds.includes(postId)}
    className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-2 transition hover:bg-muted ${saved ? "text-[hsl(var(--brand))]" : "text-muted-foreground"}`}
    onClick={async () => {
      if (!user) { toast.error(t("ブックマークするにはログインしてください。")); return; }
      try { await setBookmark(user.id, postId, !saved); }
      catch { toast.error(t("ブックマークを保存できませんでした。")); }
    }}>
    <Bookmark className="h-5 w-5" fill={saved ? "currentColor" : "none"} aria-hidden />
  </button>;
}
