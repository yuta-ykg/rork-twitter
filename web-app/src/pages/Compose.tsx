import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Avatar } from "@/components/TweetFeed";
import { useAuth } from "@/hooks/authContext";
import { useOwnProfile } from "@/hooks/useOwnProfile";
import { t, useLanguage } from "@/lib/language";
import { insertPost, MAX_CHARACTERS } from "@/lib/posts";

export default function ComposePage() {
  useLanguage();
  const { user } = useAuth();
  const own = useOwnProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const count = Array.from(draft).length;
  const trimmed = draft.trim();
  const canPost = trimmed.length > 0 && Array.from(trimmed).length <= MAX_CHARACTERS && !sending;

  function change(value: string) {
    const chars = Array.from(value);
    setDraft(chars.length > MAX_CHARACTERS ? chars.slice(0, MAX_CHARACTERS).join("") : value);
  }

  async function submit() {
    if (!canPost || !user) return;
    setSending(true);
    try {
      await insertPost(trimmed, user, image);
      await queryClient.invalidateQueries({ queryKey: ["timeline", user.id] });
      navigate("/");
    } catch {
      toast.error(t("投稿できませんでした。もう一度試してください。"));
      setSending(false);
    }
  }

  return (
    <div className="min-h-dvh bg-white text-[#0F1419]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
        <header className="flex h-12 items-center justify-between px-3">
          <button type="button" onClick={() => navigate(-1)} className="h-11 px-2 text-[15px] text-[#0F1419]">{t("キャンセル")}</button>
          <button
            type="button"
            onClick={() => { void submit(); }}
            disabled={!canPost}
            className="h-8 rounded-full bg-[#1D9BF0] px-4 text-[15px] font-bold text-white disabled:opacity-40"
          >
            {t("投稿する")}
          </button>
        </header>
        <div className="flex gap-3 px-4 pt-2">
          <Avatar initial={own?.initial ?? "あ"} index={0} url={own?.avatar} size={40} />
          <textarea
            value={draft}
            onChange={(event) => change(event.target.value)}
            placeholder={t("今の気持ちを、70字まで。")}
            className="min-h-40 w-full resize-none bg-transparent text-lg outline-none placeholder:text-[#536471]"
            autoFocus
          />
        </div>
        {preview ? (
          <div className="relative mx-4 ml-[68px] mt-2 overflow-hidden rounded-2xl border border-[#ECF0F2]">
            <img src={preview} alt={t("選んだ画像")} className="max-h-80 w-full object-cover" />
            <button
              type="button"
              onClick={() => setImage(null)}
              aria-label={t("画像を外す")}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/65 text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <div className="mt-auto flex items-center justify-between border-t border-[#ECF0F2] px-4 py-2 pb-5">
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => { setImage(event.target.files?.[0] ?? null); event.target.value = ""; }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            aria-label={t("画像を追加")}
            className="grid h-11 w-11 place-items-center rounded-full text-[#1D9BF0] active:bg-[#1D9BF0]/10"
          >
            <ImagePlus className="h-[22px] w-[22px]" />
          </button>
          <p className="font-mono text-[15px] text-[#536471]">{count} / {MAX_CHARACTERS}</p>
        </div>
      </div>
    </div>
  );
}
