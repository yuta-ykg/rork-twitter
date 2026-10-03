import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isDevelopmentSession } from "@/lib/development";
import { t, useLanguage } from "@/lib/language";
import { findCommunities, getCommunity, manageCommunity, type Community, type CommunityOperation, type CommunityPost, type CommunitySnapshot } from "@/lib/communities";
import { timeLabel } from "@/lib/posts";
import { Shell } from "./Index";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

export default function CommunitiesPage() {
  useLanguage();
  const { user } = useAuth();
  const userId = user?.id;
  const { id } = useParams();
  const navigate = useNavigate();
  const local = isDevelopmentSession();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [snapshot, setSnapshot] = useState<CommunitySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [joinedOnly, setJoinedOnly] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [draft, setDraft] = useState("");
  const postId = useRef(crypto.randomUUID());
  const createId = useRef(crypto.randomUUID());
  const active = useRef(""); active.current = `${userId ?? ""}:${id ?? ""}:${keyword}:${joinedOnly}:${retry}`;
  const [deleting, setDeleting] = useState<{ operation: "delete" | "delete_post" | "remove"; target?: string } | null>(null);
  const community = snapshot?.community;
  const owner = Boolean(userId && community?.owner_id === userId);
  const moderator = snapshot?.role === "moderator";
  const canModerate = owner || moderator;
  const canUse = Boolean(user && !local);
  useEffect(() => {
    let cancelled = false;
    setSnapshot(null); setCommunities([]); setLoading(true); setBusy(false); setLoadingMore(false);
    setError(""); setEditing(false); setDraft(""); setDeleting(null);
    if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) { setLoading(false); return; }
    const request = id ? getCommunity(id) : findCommunities(keyword, joinedOnly);
    request.then((result) => { if (!cancelled) {
      if (Array.isArray(result)) setCommunities(result); else setSnapshot(result);
    } }).catch(() => { if (!cancelled) setError(t("コミュニティを読み込めませんでした。")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, userId, keyword, joinedOnly, retry]);
  async function mutate(operation: CommunityOperation, target?: string) {
    if (!user || local || busy || loadingMore) return;
    const epoch = active.current;
    const targetId = id ?? createId.current;
    setBusy(true); setError("");
    try {
      const next = await manageCommunity(user, operation, targetId, { name, description,
        memberId: ["promote", "demote", "remove", "restore"].includes(operation) ? target : undefined,
        postId: operation === "post" ? postId.current : ["pin_post", "unpin_post", "delete_post"].includes(operation) ? target : undefined, body: draft });
      if (active.current !== epoch) return;
      setSnapshot(next); setDeleting(null); setEditing(false);
      if (operation === "post") { setDraft(""); postId.current = crypto.randomUUID(); }
      if (operation === "create") navigate(`/communities/${targetId}`);
      if (operation === "delete") navigate("/communities");
    } catch (err) { if (active.current === epoch) setError(t(err instanceof Error ? err.message : "コミュニティの操作に失敗しました。再読み込みして参加状態を確認してください。")); }
    finally { if (active.current === epoch) setBusy(false); }
  }
  async function loadMore() {
    if (!id || !snapshot?.has_more || loadingMore || busy) return;
    const cursor = snapshot.posts[snapshot.posts.length - 1]; if (!cursor) return;
    const epoch = active.current;
    setLoadingMore(true); setError("");
    try { const next = await getCommunity(id, cursor);
      if (active.current !== epoch) return;
      if (!next) { setSnapshot(null); return; }
      setSnapshot((old) => !old ? next : { ...next, posts: [...old.posts, ...next.posts.filter((post) => !old.posts.some((item) => item.id === post.id))]
        .filter((post) => post.id !== next.pinned_post?.id) });
    } catch { if (active.current === epoch) setError(t("コミュニティを読み込めませんでした。")); }
    finally { if (active.current === epoch) setLoadingMore(false); }
  }
  function edit() { setName(community?.name ?? ""); setDescription(community?.description ?? ""); setEditing(true); }
  function renderPost(post: CommunityPost, pinned = false) {
    return <article key={post.id} className={pinned ? "my-3 rounded border border-[hsl(var(--brand))] p-4" : "border-b py-4"}>
      {pinned && <p className="mb-2 text-sm font-semibold text-[hsl(var(--brand))]">{t("固定された投稿")}</p>}
      <p className="font-semibold">{post.author_name} {post.handle && <span className="font-normal text-muted-foreground">@{post.handle}</span>}</p>
      <p className="my-2 whitespace-pre-wrap break-words">{post.body}</p><time dateTime={post.created_at} className="text-sm text-muted-foreground">{timeLabel(post.created_at)}</time>
      {canUse && canModerate && <button disabled={busy || loadingMore} className="ml-3 min-h-11 text-[hsl(var(--brand))]" aria-label={`${t(pinned ? "固定を解除" : "投稿を固定")}: ${post.body}`} onClick={() => void mutate(pinned ? "unpin_post" : "pin_post", post.id)}>{t(pinned ? "固定を解除" : "投稿を固定")}</button>}
      {canUse && (canModerate || post.user_id === userId) && <button disabled={busy || loadingMore} className="ml-3 min-h-11 text-red-600" aria-label={`${t("投稿を削除")}: ${post.body}`} onClick={() => setDeleting({ operation: "delete_post", target: post.id })}>{t("投稿を削除")}</button>}
    </article>;
  }
  return <Shell tab="communities" onCompose={() => navigate("/", { state: { compose: true } })}>
    <div className="flex items-center justify-between gap-3 py-4"><h1 className="break-words text-2xl font-bold">{community?.name ?? t("コミュニティ")}</h1><Link className="min-h-11 content-center underline" to={id ? "/communities" : "/"}>{t("戻る")}</Link></div>
    <p className="mb-4 text-sm text-muted-foreground">{t("誰でも閲覧・参加できます。投稿するには参加が必要です。")}</p>
    {!canUse && <p className="my-3 text-muted-foreground">{t("コミュニティを利用するにはAppleかGoogleでログインしてください。")} <Link className="underline" to="/login">{t("ログイン")}</Link></p>}
    {error && <div role="alert" className="my-3 text-red-600">{error} <button className="min-h-11 underline" onClick={() => setRetry((value) => value + 1)}>{t("再読み込み")}</button></div>}
    <button className="mb-3 min-h-11 underline" disabled={busy || loadingMore} onClick={() => setRetry((value) => value + 1)}>{t("更新")}</button>
    {!id && <>
        <label className="block">{t("コミュニティを検索")}<input className="my-2 w-full rounded border bg-background p-3" value={keyword} maxLength={40} onChange={(event) => setKeyword(event.target.value)} /></label>
        {canUse && <label className="my-3 flex items-center gap-2"><input type="checkbox" checked={joinedOnly} onChange={(event) => setJoinedOnly(event.target.checked)} />{t("参加中のみ")}</label>}
    </>}
    {loading ? <p role="status">{t("読み込み中…")}</p> : <>
      {!id && <>
        {canUse && !editing && <button className="min-h-11 rounded-full border px-4" onClick={edit}>{t("コミュニティを作成")}</button>}
        {communities.map((item) => <Link key={item.id} className="block border-b py-4" to={`/communities/${item.id}`}><span className="block font-semibold">{item.name}</span><span className="block text-muted-foreground">{item.description}</span><span className="text-sm">{t("メンバー")}: {item.member_count} {item.is_member && t("参加中")}</span></Link>)}
        {!communities.length && <p className="py-5">{t("コミュニティがありません。")}</p>}
      </>}
      {id && !community && !error && <p>{t("コミュニティが見つかりません。")}</p>}
      {community && <>
        <p className="my-3 whitespace-pre-wrap break-words">{community.description}</p>
        <p>{t("メンバー")}: {community.member_count}</p>
        {canUse && <div className="my-3 flex flex-wrap gap-3">
          {owner ? <><button disabled={busy || loadingMore} className="min-h-11 underline" onClick={edit}>{t("コミュニティを編集")}</button><button disabled={busy || loadingMore} className="min-h-11 text-red-600" onClick={() => setDeleting({ operation: "delete" })}>{t("コミュニティを削除")}</button></> :
            snapshot?.membership === "joined" ? <button disabled={busy || loadingMore} className="min-h-11 rounded-full border px-4" onClick={() => void mutate("leave")}>{t("退出する")}</button> :
            snapshot?.membership === "removed" ? <p>{t("参加が制限されています。管理者またはモデレーターに確認してください。")}</p> :
            <button disabled={busy || loadingMore} className="min-h-11 rounded-full bg-[hsl(var(--brand))] px-4 text-white" onClick={() => void mutate("join")}>{t("参加する")}</button>}
        </div>}
        <details className="my-4 border-y py-3"><summary aria-label={t("メンバー一覧")} className="min-h-11 cursor-pointer content-center">{t("メンバー")}</summary>
          {snapshot?.members.map((member) => <div key={member.id} className="flex items-center justify-between gap-2 py-2"><span>{member.name} {member.handle && `@${member.handle}`} {member.role === "owner" && <span>{t("管理者")}</span>} {member.role === "moderator" && <span>{t("モデレーター")}</span>} {member.status === "removed" && <span>{t("参加制限中")}</span>}</span>
            {!member.is_owner && <span className="flex flex-wrap justify-end gap-3">
              {owner && member.status === "joined" && <button disabled={busy || loadingMore} className="min-h-11 text-[hsl(var(--brand))]" aria-label={`${t(member.role === "moderator" ? "モデレーターを解除" : "モデレーターにする")}: ${member.name}`} onClick={() => void mutate(member.role === "moderator" ? "demote" : "promote", member.id)}>{t(member.role === "moderator" ? "モデレーターを解除" : "モデレーターにする")}</button>}
              {canModerate && (owner || member.role !== "moderator") && <button disabled={busy || loadingMore} className="min-h-11 text-[hsl(var(--brand))]" onClick={() => member.status === "removed" ? void mutate("restore", member.id) : setDeleting({ operation: "remove", target: member.id })}>{t(member.status === "removed" ? "参加を復帰" : "メンバーを除外")}</button>}
            </span>}
          </div>)}
        </details>
        {canUse && snapshot?.membership === "joined" && <form className="my-4 space-y-2" onSubmit={(event) => { event.preventDefault(); void mutate("post"); }}>
          <label className="block">{t("コミュニティに投稿")}<textarea disabled={busy} value={draft} onChange={(event) => { setDraft(event.target.value); postId.current = crypto.randomUUID(); }} className="mt-2 min-h-24 w-full rounded border bg-background p-3" /></label>
          <p className="text-right text-sm">{Array.from(draft.trim()).length} / 70</p>
          <button disabled={busy || loadingMore || !draft.trim() || Array.from(draft.trim()).length > 70} className="min-h-11 rounded-full bg-[hsl(var(--brand))] px-5 text-white">{t(busy ? "送信中…" : "投稿する")}</button>
        </form>}
        <h2 className="mt-6 text-lg font-semibold">{t("コミュニティの投稿")}</h2>
        {snapshot?.pinned_post && renderPost(snapshot.pinned_post, true)}
        {snapshot?.posts.map((post) => renderPost(post))}
        {!snapshot?.pinned_post && !snapshot?.posts.length && <p className="py-6 text-muted-foreground">{t("まだ投稿がありません。")}</p>}
        {snapshot?.has_more && <button disabled={loadingMore || busy} className="min-h-11 w-full underline" onClick={() => void loadMore()}>{t(loadingMore ? "読み込み中…" : "もっと見る")}</button>}
      </>}
      {editing && canUse && <form className="my-4 space-y-3 rounded border p-3" onSubmit={(event) => { event.preventDefault(); void mutate(id ? "update" : "create"); }}>
        <label className="block">{t("コミュニティ名（1〜40文字）")}<input required value={name} disabled={busy} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded border bg-background p-3" /></label>
        <label className="block">{t("説明（160文字まで）")}<textarea value={description} disabled={busy} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded border bg-background p-3" /></label>
        <button disabled={busy} className="min-h-11 rounded-full bg-[hsl(var(--brand))] px-5 text-white">{t(busy ? "保存中…" : "保存")}</button><button disabled={busy} type="button" className="ml-3 min-h-11" onClick={() => setEditing(false)}>{t("キャンセル")}</button>
      </form>}
    </>}
    <AlertDialog open={deleting !== null} onOpenChange={(open) => { if (!busy && !open) setDeleting(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t(deleting?.operation === "remove" ? "メンバーを除外しますか？" : deleting?.operation === "delete_post" ? "投稿を削除しますか？" : "コミュニティを削除しますか？")}</AlertDialogTitle>
        <AlertDialogDescription>{t(deleting?.operation === "remove" ? "管理者またはモデレーターが復帰させるまで、このメンバーは参加・投稿できなくなります。" : deleting?.operation === "delete" ? "コミュニティ、メンバー情報、すべての投稿が削除されます。この操作は取り消せません。" : "この操作は取り消せません。")}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>{t("キャンセル")}</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); if (deleting) void mutate(deleting.operation, deleting.target); }}>{t("実行する")}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </Shell>;
}
