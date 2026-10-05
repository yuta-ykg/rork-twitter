import { useEffect, useState, type ReactNode } from "react";
import { Heart } from "lucide-react";
import {
  LikeIconContext, likeIconOptions, saveLikeIcon, storedLikeIcon, useLikeIcon,
  type LikeIcon,
} from "@/hooks/likeIconState";

export function LikeIconProvider({ children }: { children: ReactNode }) {
  const [likeIcon, setIcon] = useState<LikeIcon>(storedLikeIcon);
  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key === "iruka-like-icon" || event.key === null) setIcon(storedLikeIcon());
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function setLikeIcon(next: LikeIcon) {
    setIcon(saveLikeIcon(next));
  }
  return <LikeIconContext.Provider value={{ likeIcon, setLikeIcon }}>{children}</LikeIconContext.Provider>;
}

export function LikeIconGlyph({ liked = false, className }: { liked?: boolean; className?: string }) {
  const { likeIcon } = useLikeIcon();
  const Icon = likeIconOptions.find((option) => option.value === likeIcon)?.Icon ?? Heart;
  return <Icon className={className} fill={liked ? "currentColor" : "none"} aria-hidden />;
}
