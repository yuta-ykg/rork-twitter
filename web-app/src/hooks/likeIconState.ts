import { createContext, useContext } from "react";
import { ArrowBigUp, Heart, Star, ThumbsUp } from "lucide-react";

export const likeIconOptions = [
  { value: "heart", label: "デフォルト", Icon: Heart },
  { value: "star", label: "ふぁぼ", Icon: Star },
  { value: "thumbs-up", label: "高評価", Icon: ThumbsUp },
  { value: "upvote", label: "賛成", Icon: ArrowBigUp },
] as const;
export type LikeIcon = typeof likeIconOptions[number]["value"];

const key = "iruka-like-icon";
export function validLikeIcon(value: unknown): LikeIcon {
  return likeIconOptions.find((option) => option.value === value)?.value ?? "heart";
}

export function storedLikeIcon(): LikeIcon {
  try { return validLikeIcon(localStorage.getItem(key)); } catch { return "heart"; }
}

export function saveLikeIcon(value: LikeIcon): LikeIcon {
  const selected = validLikeIcon(value);
  try { localStorage.setItem(key, selected); } catch { /* Still apply for this session. */ }
  return selected;
}

export const LikeIconContext = createContext<{
  likeIcon: LikeIcon;
  setLikeIcon: (icon: LikeIcon) => void;
} | null>(null);

export function useLikeIcon() {
  const context = useContext(LikeIconContext);
  if (!context) throw new Error("LikeIconProvider is missing");
  return context;
}
