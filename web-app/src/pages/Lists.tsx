import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { t, useLanguage } from "@/lib/language";
import { isDevelopmentSession } from "@/lib/development";
import { fetchPosts, setPostLike, type Post } from "@/lib/posts";
import { createUserList, deleteUserList, fetchListMembers, fetchUserLists, renameUserList, searchListAccounts, setListMember, validateListName, type ListAccount, type ListMember, type UserList } from "@/lib/userLists";
import { Shell, Row } from "@/pages/Index";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const buttonClass = "min-h-11 rounded-xl border border-input px-4 disabled:opacity-50";
const inputClass = "min-h-11 w-full rounded-xl border border-input bg-background p-3";
const saveError = "リストを保存できませんでした。";
function errorMessage(error: unknown) {
  return error instanceof Error && ["リスト名は1〜40文字で入力してください。", "リストが見つかりません。"].includes(error.message) ? error.message : saveError;
}
export function ListsPage() {
  useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lists, setLists] = useState<UserList[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const createId = useRef({ id: crypto.randomUUID(), name: "" });
  const identity = useRef(user?.id);
  identity.current = user?.id;
  useEffect(() => {
    let cancelled = false;
    setLists([]); setLoading(true); setError("");
    if (!user) { setLoading(false); return; }
    fetchUserLists(user.id).then((rows) => { if (!cancelled) setLists(rows); })
      .catch(() => { if (!cancelled) setError("リストを読み込めませんでした。"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id, retry]);
  async function create(event: FormEvent) {
    event.preventDefault();
    if (!user || saving) return;
    const userId = user.id;
    setSaving(true); setError("");
    try {
      const trimmed = validateListName(name);
      if (createId.current.name !== trimmed) createId.current = { id: crypto.randomUUID(), name: trimmed };
      await createUserList(userId, createId.current.id, trimmed);
      if (identity.current !== userId) return;
      setName(""); createId.current = { id: crypto.randomUUID(), name: "" }; setRetry((r) => r + 1);
    } catch (error) { if (identity.current === userId) setError(errorMessage(error)); }
    finally { if (identity.current === userId) setSaving(false); }
  }
  return <Shell tab="lists" onCompose={() => navigate("/", { state: { compose: true } })}>
    <h1 className="pt-4 text-[28px] font-bold">{t("リスト")}</h1>
    <p className="mb-5 mt-2 text-muted-foreground">{t(isDevelopmentSession() ? "リストはこの端末に保存されます。" : "リストは自分だけが閲覧でき、アカウントに保存されます。")}</p>
    {user ? <>
      <form onSubmit={create} className="mb-5 flex flex-col gap-3">
        <label htmlFor="new-list-name" className="font-semibold">{t("新しいリスト")}</label>
        <input id="new-list-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={inputClass} placeholder={t("リスト名（1〜40文字）")} disabled={saving} />
        <button type="submit" disabled={saving || !name.trim()} className={buttonClass}>{t(saving ? "保存中…" : "リストを作成")}</button>
      </form>
      {error && <div className="mb-4"><p role="alert" className="text-red-600">{t(error)}</p><button className={buttonClass} onClick={() => setRetry((r) => r + 1)}>{t("再読み込み")}</button></div>}
      {loading ? <p role="status">{t("読み込み中…")}</p> : lists.length ? lists.map((list) => <Link key={list.id} to={"/lists/" + list.id} className="mb-3 block rounded-xl border border-border p-4">
        <span className="block break-words text-lg font-semibold">{list.name}</span>
        <span className="text-sm text-muted-foreground">{t("メンバー")} · {list.member_count}</span>
      </Link>) : !error && <p className="py-8 text-center text-muted-foreground">{t("まだリストがありません。")}</p>}
    </> : <p>{t("リストを使うにはログインしてください。")}</p>}
  </Shell>;
}

export function ListPage() {
  useLanguage();
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<UserList | null>(null);
  const [members, setMembers] = useState<ListMember[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [tab, setTab] = useState<"posts" | "members">("posts");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ListAccount[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const identity = useRef("");
  identity.current = (user?.id ?? "") + ":" + id;
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setList(null); setMembers([]); setPosts([]); setError(""); setEditing(false);
    if (!user || !id) { setLoading(false); return; }
    Promise.all([fetchUserLists(user.id), fetchListMembers(user.id, id), fetchPosts(user.id, id)])
      .then(([lists, nextMembers, nextPosts]) => {
        if (cancelled) return;
        const next = lists.find((l) => l.id === id);
        if (!next) throw new Error("リストが見つかりません。");
        setList(next); setName(next.name); setMembers(nextMembers); setPosts(nextPosts);
      })
      .catch(() => { if (!cancelled) setError("リストを読み込めませんでした。"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id, id, retry]);
  useEffect(() => {
    let cancelled = false;
    setResults([]); setSearchError(""); setSearching(false);
    if (!user || !query.trim()) return;
    setSearching(true);
    const timer = setTimeout(() => {
      searchListAccounts(user.id, query).then((rows) => { if (!cancelled) setResults(rows); })
        .catch(() => { if (!cancelled) setSearchError("ユーザーを検索できませんでした。"); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, user?.id]);
  async function mutate(action: () => Promise<void>, deleted = false) {
    if (!user || !id || busy) return;
    const started = identity.current;
    setBusy(true); setError("");
    try {
      await action();
      if (identity.current !== started) return;
      if (deleted) { navigate("/lists", { replace: true }); return; }
      const [nextLists, nextMembers, nextPosts] = await Promise.all([fetchUserLists(user.id), fetchListMembers(user.id, id), fetchPosts(user.id, id)]);
      if (identity.current !== started) return;
      const next = nextLists.find((l) => l.id === id);
      if (!next) throw new Error("リストが見つかりません。");
      setList(next); setName(next.name); setMembers(nextMembers); setPosts(nextPosts); setEditing(false);
    } catch (error) { if (identity.current === started) setError(errorMessage(error)); }
    finally { if (identity.current === started) setBusy(false); }
  }
  async function like(post: Post) {
    if (!user) return;
    const started = identity.current;
    try {
      const state = await setPostLike(post.id, !post.isLiked, user.id);
      if (identity.current === started) setPosts((rows) => rows.map((p) => p.id === post.id ? { ...p, ...state } : p));
    } catch { toast.error(t("いいねを保存できませんでした。もう一度試してください。")); }
  }
  return <Shell tab="lists" onCompose={() => navigate("/", { state: { compose: true } })}>
    <Link to="/lists" className="inline-flex min-h-11 items-center text-[hsl(var(--brand))]">{t("リスト一覧へ")}</Link>
    {loading ? <p role="status">{t("読み込み中…")}</p> : list && user && id ? <>
      <h1 className="break-words text-[28px] font-bold">{list.name}</h1>
      <p className="my-2 text-muted-foreground">{t("自分だけが閲覧できるリスト")} · {t("メンバー")} {list.member_count}</p>
      {editing ? <form onSubmit={(e) => { e.preventDefault(); void mutate(() => renameUserList(user.id, id, name)); }} className="my-3 flex flex-col gap-2">
        <label htmlFor="rename-list">{t("リスト名（1〜40文字）")}</label>
        <input id="rename-list" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className={inputClass} disabled={busy} />
        <div className="flex gap-2"><button type="submit" disabled={busy} className={buttonClass}>{t("保存")}</button>
          <button type="button" disabled={busy} className={buttonClass} onClick={() => { setName(list.name); setEditing(false); }}>{t("キャンセル")}</button></div>
      </form> : <div className="my-3 flex gap-2">
        <button className={buttonClass} disabled={busy} onClick={() => setEditing(true)}>{t("名前を変更")}</button>
        <AlertDialog><AlertDialogTrigger asChild><button className={buttonClass} disabled={busy}>{t("リストを削除")}</button></AlertDialogTrigger>
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("リストを削除しますか？")}</AlertDialogTitle>
            <AlertDialogDescription>{t("リストとメンバー登録を削除します。投稿やユーザーは削除されません。")}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>{t("キャンセル")}</AlertDialogCancel>
              <AlertDialogAction onClick={() => void mutate(() => deleteUserList(user.id, id), true)}>{t("削除")}</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent></AlertDialog>
      </div>}
      <div className="mb-4 flex gap-2">
        <button className={buttonClass} aria-pressed={tab === "posts"} onClick={() => setTab("posts")}>{t("投稿")}</button>
        <button className={buttonClass} aria-pressed={tab === "members"} onClick={() => setTab("members")}>{t("メンバー")}</button>
        <button className={buttonClass} disabled={busy} onClick={() => setRetry((r) => r + 1)}>{t("再読み込み")}</button>
      </div>
      {tab === "posts" ? posts.length ? posts.map((p) => <Row key={p.id} post={p} showAuthor onLike={() => like(p)} />)
        : <p className="py-8 text-muted-foreground">{t("このリストに表示できる投稿はありません。メンバーを追加してください。")}</p> : <>
        <label htmlFor="list-account-search" className="font-semibold">{t("メンバーを追加")}</label>
        <input id="list-account-search" type="search" value={query} maxLength={100} onChange={(e) => setQuery(e.target.value)} className={"my-3 " + inputClass} placeholder={t("名前やユーザー名で検索")} />
        {searching && <p role="status">{t("読み込み中…")}</p>}
        {searchError && <p role="alert">{t(searchError)}</p>}
        {query.trim() && !searching && !searchError && !results.length && <p>{t("ユーザーが見つかりません。")}</p>}
        {results.map((account) => { const included = members.some((m) => m.target_id === account.id);
          return <div key={account.id} className="flex items-center justify-between gap-3 border-b border-border py-2">
            <Link to={"/profile/" + encodeURIComponent(account.id)} className="min-h-11 min-w-0 break-words">{account.name} {account.handle && <span className="text-muted-foreground">@{account.handle}</span>}</Link>
            <button className={buttonClass + " shrink-0"} disabled={busy || included} onClick={() => void mutate(() => setListMember(user.id, id, account.id, true))}>{t(included ? "登録済み" : "追加")}</button>
          </div>;
        })}
        <h2 className="mt-6 text-xl font-semibold">{t("登録メンバー")}</h2>
        {!members.length && <p className="py-4 text-muted-foreground">{t("まだメンバーがいません。")}</p>}
        {members.map((member) => <div key={member.target_id} className="flex items-center justify-between gap-3 border-b border-border py-2">
          {member.is_blocked ? <span>{t("ブロック中のアカウント")}</span> : <Link to={"/profile/" + encodeURIComponent(member.target_id)} className="min-h-11 min-w-0 break-words">{member.target_name ?? t("ユーザー")} {member.target_handle && <span className="text-muted-foreground">@{member.target_handle}</span>}</Link>}
          <button className={buttonClass + " shrink-0"} disabled={busy} onClick={() => void mutate(() => setListMember(user.id, id, member.target_id, false))}>{t("解除")}</button>
        </div>)}
      </>}
    </> : null}
    {error && <div className="my-4"><p role="alert" className="text-red-600">{t(error)}</p>
      <button disabled={busy} className={buttonClass} onClick={() => setRetry((r) => r + 1)}>{t("再読み込み")}</button></div>}
  </Shell>;
}

export function ListMembershipPicker({ userId, targetId }: { userId: string; targetId: string }) {
  useLanguage();
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<UserList[]>([]);
  const [membersByList, setMembersByList] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadingLists, setLoadingLists] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!open) return;
    setLoadingLists(true);
    setError("");
    fetchUserLists(userId).then(async (rows) => {
      const memberRows = await Promise.all(rows.map((row) => fetchListMembers(userId, row.id)));
      if (!cancelled) {
        setLists(rows);
        setMembersByList(Object.fromEntries(rows.map((row, i) => [row.id, memberRows[i].map((m) => m.target_id)])));
      }
    }).catch(() => { if (!cancelled) setError("リストを読み込めませんでした。"); })
      .finally(() => { if (!cancelled) setLoadingLists(false); });
    return () => { cancelled = true; };
  }, [open, userId]);
  async function toggle(row: UserList) {
    if (busy) return;
    const included = membersByList[row.id]?.includes(targetId) ?? false;
    setBusy(true); setError("");
    try {
      await setListMember(userId, row.id, targetId, !included);
      setMembersByList((current) => ({ ...current, [row.id]: included
        ? current[row.id].filter((id) => id !== targetId)
        : [...(current[row.id] ?? []), targetId] }));
    } catch { setError("リストを保存できませんでした。"); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><button type="button" className="min-h-11 rounded-full border border-input px-4">{t("リストに追加")}</button></DialogTrigger>
    <DialogContent className="max-h-[80dvh] overflow-y-auto">
      <DialogHeader><DialogTitle>{t("リストに追加")}</DialogTitle>
        <DialogDescription>{t("このアカウントを追加するリストを選択します。")}</DialogDescription></DialogHeader>
      {error && <p role="alert" className="text-red-600">{t(error)}</p>}
      {loadingLists ? <p role="status">{t("読み込み中…")}</p> : !lists.length && !error ? <p className="text-muted-foreground">{t("リストがありません。")} <Link to="/lists" onClick={() => setOpen(false)} className="text-[hsl(var(--brand))]">{t("リストを作成")}</Link></p> :
        lists.map((row) => <label key={row.id} className="flex min-h-12 items-center gap-3 border-b border-border py-2">
          <input type="checkbox" checked={membersByList[row.id]?.includes(targetId) ?? false} disabled={busy || !(row.id in membersByList)}
            onChange={() => void toggle(row)} className="h-5 w-5 accent-[hsl(var(--brand))]" />
          <span className="break-words">{row.name}</span>
        </label>)}
      <Link to="/lists" onClick={() => setOpen(false)} className="min-h-11 self-start text-[hsl(var(--brand))]">{t("リストを管理")}</Link>
    </DialogContent>
  </Dialog>;
}

