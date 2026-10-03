import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { t, useLanguage } from "@/lib/language";
import { isDevelopmentSession } from "@/lib/development";
import { manageLists, searchListProfiles, type ListMember, type UserList } from "@/lib/lists";
import { filterListPosts, validateList, type ListOperation } from "@/lib/listModel";
import { fetchPosts, setPostLike, type Post } from "@/lib/posts";
import { Shell, Row } from "./Index";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

export default function ListsPage() {
  useLanguage();
  const { user } = useAuth();
  const { id } = useParams();
  const userId = user?.id;
  const navigate = useNavigate();
  const [lists, setLists] = useState<UserList[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ListMember[]>([]);
  const [searching, setSearching] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const active = useRef(user?.id); active.current = user?.id;
  const searchVersion = useRef(0);
  const list = lists.find((item) => item.id === id);
  useEffect(() => {
    let cancelled = false;
    const versions = searchVersion;
    setSearching(false);
    setLists([]); setPosts([]); setResults([]); setQuery(""); setEditing(false);
    setError(""); setLoading(true); setBusy(false);
    if (!userId) { setLoading(false); return; }
    Promise.all([manageLists(userId), fetchPosts(userId)])
      .then(([next, timeline]) => { if (!cancelled) { setLists(next); setPosts(timeline); } })
      .catch(() => { if (!cancelled) setError(t("リストを読み込めませんでした。")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; versions.current++; };
  }, [userId, id, retry]);
  async function mutate(operation: ListOperation, member?: ListMember) {
    if (!user || busy) return;
    const userId = user.id;
    setError("");
    try {
      if (operation === "create" || operation === "update") validateList(name, description);
      setBusy(true);
      const targetId = operation === "create" ? crypto.randomUUID() : id ?? "";
      const next = await manageLists(userId, operation, targetId, name, description, member);
      if (active.current !== userId) return;
      setLists(next); setEditing(false); setConfirmDelete(false);
      if (operation === "create") navigate(`/lists/${targetId}`);
      if (operation === "delete") navigate("/lists");
    } catch (err) { if (active.current === userId) setError(t(err instanceof Error ? err.message : "リストを保存できませんでした。")); }
    finally { if (active.current === userId) setBusy(false); }
  }
  async function search() {
    if (!user) return;
    const version = ++searchVersion.current; const userId = user.id;
    setSearching(true); setError(""); setResults([]);
    try { const next = await searchListProfiles(userId, query);
      if (active.current === userId && version === searchVersion.current) setResults(next);
    } catch { if (active.current === userId && version === searchVersion.current) setError(t("ユーザーを検索できませんでした。")); }
    finally { if (version === searchVersion.current) setSearching(false); }
  }
  return <Shell tab="lists" onCompose={() => navigate("/", { state: { compose: true } })}>
    <div className="flex items-center justify-between gap-3 py-4">
      <h1 className="text-2xl font-bold">{list?.name ?? t("リスト")}</h1>
      <Link to={id ? "/lists" : "/"} className="min-h-11 content-center text-[hsl(var(--brand))]">{t("戻る")}</Link>
    </div>
    <p className="mb-4 text-sm text-muted-foreground">{t(isDevelopmentSession() ? "リストはこの端末に保存されます。" : "リストは自分だけに表示され、端末間で共有されます。")}</p>
    {error && <div role="alert" className="my-3 text-red-600">{error}<button className="ml-3 min-h-11 underline" onClick={() => setRetry((value) => value + 1)}>{t("再読み込み")}</button></div>}
    {loading ? <p role="status">{t("読み込み中…")}</p> : <>
      {id && !list ? <p>{t("リストが見つかりません。")}</p> : <>
        {!editing && <button disabled={busy} className="min-h-11 rounded-full border px-4" onClick={() => {
          setName(list?.name ?? ""); setDescription(list?.description ?? ""); setEditing(true);
        }}>{t(list ? "リストを編集" : "リストを作成")}</button>}
        {editing && <form className="my-4 space-y-3" onSubmit={(event) => { event.preventDefault(); void mutate(list ? "update" : "create"); }}>
          <label className="block">{t("リスト名（1〜40文字）")}<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded border bg-background p-3" /></label>
          <label className="block">{t("説明（160文字まで）")}<textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded border bg-background p-3" /></label>
          <button disabled={busy} className="min-h-11 rounded-full bg-[hsl(var(--brand))] px-5 text-white">{t(busy ? "保存中…" : "保存")}</button>
          <button type="button" disabled={busy} className="ml-3 min-h-11" onClick={() => setEditing(false)}>{t("キャンセル")}</button>
        </form>}
        {!id && <div className="mt-4">{lists.length ? lists.map((item) => <Link className="block border-b py-4" key={item.id} to={`/lists/${item.id}`}>
          <span className="block text-lg font-semibold">{item.name}</span><span className="block break-words text-sm text-muted-foreground">{item.description}</span>
          <span className="text-sm">{t("メンバー")}: {item.members.length}</span>
        </Link>) : <p className="py-8 text-muted-foreground">{t("まだリストがありません。")}</p>}</div>}
        {list && <>
          <p className="my-3 break-words">{list.description}</p>
          <section className="my-5 border-y py-4">
            <h2 className="text-lg font-semibold">{t("メンバー")}</h2>
            {list.members.map((member) => <div key={member.id} className="flex items-center justify-between gap-3 py-2">
              <Link to={`/profile/${encodeURIComponent(member.id)}`}>{member.name} {member.handle && `@${member.handle}`}</Link>
              <button disabled={busy} aria-label={`${member.name}: ${t("リストから削除")}`} className="min-h-11 text-red-600" onClick={() => void mutate("remove", member)}>{t("解除")}</button>
            </div>)}
            {!list.members.length && <p className="my-3 text-muted-foreground">{t("ユーザーを追加すると投稿が表示されます。")}</p>}
            <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); void search(); }}>
              <input aria-label={t("ユーザーを検索")} placeholder={t("ユーザー名・表示名")} value={query} maxLength={40}
                onChange={(event) => { searchVersion.current++; setSearching(false); setResults([]); setQuery(event.target.value); }} className="min-w-0 flex-1 rounded border bg-background p-2" />
              <button disabled={searching || !query.trim()} className="min-h-11 px-3">{t(searching ? "読み込み中…" : "検索")}</button>
            </form>
            {results.map((member) => <div key={member.id} className="flex items-center justify-between gap-3 py-2">
              <span>{member.name} {member.handle && `@${member.handle}`}</span>
              <button disabled={busy || list.members.some((item) => item.id === member.id)} className="min-h-11 text-[hsl(var(--brand))] disabled:opacity-40" onClick={() => void mutate("add", member)}>{t("追加")}</button>
            </div>)}
          </section>
          <h2 className="text-lg font-semibold">{t("リストの投稿")}</h2>
          {filterListPosts(posts, list).map((post) => <Row key={post.id} post={post} showAuthor onLike={async () => {
            if (!user) return;
            const userId = user.id;
            try { const state = await setPostLike(post.id, !post.isLiked, userId);
              if (active.current === userId) setPosts((rows) => rows.map((row) => row.id === post.id ? { ...row, ...state } : row));
            } catch { if (active.current === userId) setError(t("いいねを保存できませんでした。")); }
          }} />)}
          {!filterListPosts(posts, list).length && <p className="py-6 text-muted-foreground">{t("まだ投稿がありません。")}</p>}
          <button disabled={busy} className="my-6 min-h-11 text-red-600" onClick={() => setConfirmDelete(true)}>{t("リストを削除")}</button>
          <AlertDialog open={confirmDelete} onOpenChange={(open) => { if (!busy) setConfirmDelete(open); }}>
            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("リストを削除しますか？")}</AlertDialogTitle>
              <AlertDialogDescription>{t("リストとメンバー設定が削除されます。投稿は削除されません。")}</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel disabled={busy}>{t("キャンセル")}</AlertDialogCancel>
                <AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void mutate("delete"); }}>{t("削除する")}</AlertDialogAction>
              </AlertDialogFooter></AlertDialogContent>
          </AlertDialog>
        </>}
      </>}
    </>}
  </Shell>;
}
