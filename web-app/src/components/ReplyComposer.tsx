import { useRef, useState } from "react";
import { useAuth } from "@/hooks/authContext";
import { insertReply, MAX_CHARACTERS, type Post } from "@/lib/posts";
import { t, useLanguage } from "@/lib/language";
import { Link } from "react-router-dom";

export function ReplyComposer({ post, onReply }: { post: Post; onReply: (reply: Post) => void }) {
  useLanguage();
  const { user } = useAuth();
  const currentUser = useRef(user?.id); currentUser.current = user?.id;
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const replyId = useRef<string | null>(null);
  const count = Array.from(draft).length;
  if (!user) return <p className="my-5 text-muted-foreground">{t("返信するにはログインしてください。")} <Link to="/mine" className="inline-flex min-h-11 items-center text-[hsl(var(--brand))]">{t("ログイン")}</Link></p>;
  return <form className="my-5 space-y-3" onSubmit={async (event) => {
    event.preventDefault();
    if (pending || !draft.trim() || count > MAX_CHARACTERS) return;
    const author = user;
    setPending(true); setError("");
    const requestId = replyId.current ?? crypto.randomUUID(); replyId.current = requestId;
    try {
      const reply = await insertReply(draft, post.id, author, requestId);
      if (currentUser.current === author.id) { onReply(reply); setDraft(""); replyId.current = null; }
    } catch { if (currentUser.current === author.id) setError("返信を保存できませんでした。"); }
    finally { setPending(false); }
  }}>
    <label htmlFor="reply-body" className="block text-sm text-muted-foreground">{t("返信先")}: {post.handle}</label>
    <textarea id="reply-body" aria-label={t("返信本文")} value={draft} disabled={pending}
      onChange={(event) => { setDraft(event.target.value); replyId.current = null; setError(""); }}
      className="min-h-24 w-full rounded-xl border border-input bg-background p-3 text-base" />
    <div className="flex items-center justify-between">
      <span className={count > MAX_CHARACTERS ? "text-red-500" : "text-muted-foreground"}>{count} / {MAX_CHARACTERS}</span>
      <button type="submit" disabled={pending || !draft.trim() || count > MAX_CHARACTERS}
        className="min-h-11 rounded-full bg-[hsl(var(--brand))] px-5 text-white disabled:opacity-40">{t(pending ? "送信中…" : "返信する")}</button>
    </div>
    {error && <p role="alert" className="text-red-500">{t(error)}</p>}
  </form>;
}
