import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Heart, Star } from "lucide-react";

export const likeIconOptions = [
  { value: "heart", label: "ハート", Icon: Heart },
  { value: "star", label: "星", Icon: Star },
] as const;
export type LikeIcon = typeof likeIconOptions[number]["value"];
const key = "iruka-like-icon";
function validLikeIcon(value: unknown): LikeIcon {
  return value === "star" ? "star" : "heart";
}
function storedLikeIcon(): LikeIcon {
  try { return validLikeIcon(localStorage.getItem(key)); } catch { return "heart"; }
}
const LikeIconContext = createContext<{
  likeIcon: LikeIcon;
  setLikeIcon: (icon: LikeIcon) => void;
} | null>(null);

export function LikeIconProvider({ children }: { children: ReactNode }) {
  const [likeIcon, setIcon] = useState<LikeIcon>(storedLikeIcon);
  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key === key || event.key === null) setIcon(storedLikeIcon());
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function setLikeIcon(next: LikeIcon) {
    const selected = validLikeIcon(next);
    try { localStorage.setItem(key, selected); } catch { /* Still apply for this session. */ }
    setIcon(selected);
  }
  return <LikeIconContext.Provider value={{ likeIcon, setLikeIcon }}>{children}</LikeIconContext.Provider>;
}
export function useLikeIcon() {
  const context = useContext(LikeIconContext);
  if (!context) throw new Error("LikeIconProvider is missing");
  return context;
}
export function LikeIconGlyph({ liked = false, className }: { liked?: boolean; className?: string }) {
  const { likeIcon } = useLikeIcon();
  const Icon = likeIcon === "star" ? Star : Heart;
  return <Icon className={className} fill={liked ? "currentColor" : "none"} aria-hidden />;
}
