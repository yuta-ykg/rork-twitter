import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { fetchPublicList, type UserList } from "@/lib/lists";
import { t, useLanguage } from "@/lib/language";
import { timeLabel, type Post } from "@/lib/posts";
import { useDateDisplay } from "@/lib/dateDisplay";

export default function PublicListPage() {
  useLanguage();
  useDateDisplay();
  const { id } = useParams();
  const { user } = useAuth();
  const [list, setList] = useState<UserList | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setList(null); setPosts([]); setLoading(true); setError(false);
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) { setLoading(false); return; }
    fetchPublicList(id).then((data) => { if (!cancelled) { setList(data?.list ?? null); setPosts(data?.posts ?? []); } })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, user?.id, retry]);
  return <main className="mx-auto min-h-dvh max-w-xl bg-background p-5 text-foreground">
    <header className="mb-6 flex items-center justify-between"><Link to={user ? "/lists" : "/login"}>{t(user ? "リスト" : "ログイン")}</Link><span>{t("公開リスト")}</span></header>
    {loading ? <p role="status">{t("読み込み中…")}</p> : error ? <div role="alert"><p>{t("公開リストを読み込めませんでした。")}</p><button className="min-h-11 underline" onClick={() => setRetry((value) => value + 1)}>{t("再読み込み")}</button></div> : !list ? <p>{t("このリストは公開されていないか、削除されています。")}</p> : <>
      <h1 className="break-words text-2xl font-bold">{list.name}</h1>
      <p className="my-3 whitespace-pre-wrap break-words text-muted-foreground">{list.description}</p>
      {user?.id === list.owner_id && <Link className="inline-flex min-h-11 items-center underline" to={`/lists/${list.id}`}>{t("リストを編集")}</Link>}
      <section className="my-5 border-y py-4"><h2 className="font-semibold">{t("メンバー")}</h2>
        {list.members.map((member) => <p className="py-1" key={member.id}>{member.name} {member.handle && `@${member.handle}`}</p>)}
      </section>
      <h2 className="text-lg font-semibold">{t("リストの投稿")}</h2>
      {posts.map((post) => <article key={post.id} className="border-b py-4"><p className="font-semibold">{post.authorName} <span className="font-normal text-muted-foreground">{post.handle}</span></p>
        <p className="my-2 whitespace-pre-wrap break-words">{post.body}</p><time dateTime={post.createdAt} className="text-sm text-muted-foreground">{timeLabel(post.createdAt)}</time></article>)}
      {!posts.length && <p className="py-6 text-muted-foreground">{t("まだ投稿がありません。")}</p>}
    </>}
  </main>;
}
