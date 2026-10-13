import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/authContext";
import { supabase } from "@/lib/supabase";
import { t, useLanguage } from "@/lib/language";
import type { Post } from "@/lib/posts";

/** 投稿を閲覧できる人に、置き換えられた本文と変更日時を表示する。 */
export function PostEditHistory({ post }: { post: Post }) {
  const [open, setOpen] = useState<boolean>(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const { user } = useAuth();
  const { language } = useLanguage();
  const history = useQuery({
    queryKey: ["post-edit-history", user?.id, post.id, post.editedAt],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_post_edit_history", { target_post_id: post.id });
      if (error) throw error;
      return data ?? [];
    },
  });
  if (!post.editedAt) return null;
  return <>
    <button type="button" className="min-h-11 text-[13px] text-muted-foreground underline-offset-4 hover:underline" onClick={() => { setOpen(true); dialog.current?.showModal(); }}>{t("編集済み")}</button>
    <dialog ref={dialog} aria-label={t("編集履歴")} onClose={() => setOpen(false)} className="m-auto max-h-[80dvh] w-[calc(100%-32px)] max-w-lg space-y-3 overflow-y-auto rounded-2xl bg-background p-5 text-foreground shadow-lg backdrop:bg-black/40">
        <h2 className="text-[17px] font-bold">{t("編集履歴")}</h2>
        <p className="text-[13px] text-muted-foreground">{t("編集前の本文と、変更された日時を表示します。")}</p>
        {history.isPending ? <p>{t("読み込み中…")}</p> : null}
        {history.isError ? <div><p>{t("履歴を読み込めませんでした。")}</p><button type="button" className="min-h-11 text-[#1D9BF0]" onClick={() => void history.refetch()}>{t("再読み込み")}</button></div> : null}
        <ol className="divide-y divide-border">
          {history.data?.map((entry) => <li key={entry.id} className="py-4">
            <time dateTime={entry.edited_at} className="text-[13px] text-muted-foreground">{new Date(entry.edited_at).toLocaleString(language, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
            <p className="mt-2 whitespace-pre-wrap break-words text-[15px]">{entry.body}</p>
          </li>)}
        </ol>
        <button type="button" className="min-h-11 w-full rounded-full border border-border font-bold" onClick={() => dialog.current?.close()}>{t("閉じる")}</button>
    </dialog>
  </>;
}
