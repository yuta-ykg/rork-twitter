import { useState } from "react";
import { Link } from "react-router-dom";
import { t, useLanguage } from "@/lib/language";
import { fetchProfile } from "@/lib/profiles";
import { manageLists, type ListMember, type UserList } from "@/lib/lists";

export function ListMembershipPicker({ userId, targetId }: { userId: string; targetId: string }) {
  useLanguage();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [lists, setLists] = useState<UserList[]>([]);
  const [member, setMember] = useState<ListMember | null>(null);

  async function showLists() {
    setOpen(true); setLoading(true); setError("");
    try {
      const [profile, nextLists] = await Promise.all([fetchProfile(targetId), manageLists(userId)]);
      if (!profile) throw new Error(t("プロフィールが見つかりません。"));
      setMember({ id: profile.id, name: profile.name, handle: profile.handle });
      setLists(nextLists);
    } catch (err) {
      setError(t(err instanceof Error ? err.message : "リストを読み込めませんでした。"));
    } finally { setLoading(false); }
  }

  async function toggle(list: UserList) {
    if (!member || busy) return;
    const included = list.members.some((item) => item.id === member.id);
    setBusy(list.id); setError("");
    try {
      setLists(await manageLists(userId, included ? "remove" : "add", list.id, "", "", member));
    } catch (err) {
      setError(t(err instanceof Error ? err.message : "リストを保存できませんでした。"));
    } finally { setBusy(""); }
  }

  return <div className="relative">
    <button type="button" onClick={() => void showLists()} className="min-h-11 rounded-full border border-input px-4">
      {t("リストに追加")}
    </button>
    {open && <div role="dialog" aria-label={t("リストに追加")} className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-border bg-background p-3 shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{t("リストに追加")}</h2>
        <button type="button" className="min-h-11 px-2" onClick={() => setOpen(false)}>{t("閉じる")}</button>
      </div>
      {error && <p role="alert" className="py-2 text-sm text-red-600">{error}</p>}
      {loading ? <p role="status" className="py-3">{t("読み込み中…")}</p> : lists.length ? <ul className="max-h-60 overflow-y-auto">
        {lists.map((list) => {
          const included = Boolean(member && list.members.some((item) => item.id === member.id));
          return <li key={list.id}><button type="button" disabled={Boolean(busy)} aria-pressed={included}
            onClick={() => void toggle(list)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded px-2 text-left hover:bg-muted disabled:opacity-50">
            <span className="truncate">{list.name}</span><span aria-hidden>{busy === list.id ? "…" : included ? "✓" : "＋"}</span>
          </button></li>;
        })}
      </ul> : !error ? <p className="py-3 text-sm text-muted-foreground">{t("まだリストがありません。")}</p> : null}
      <Link to="/lists" className="mt-2 block min-h-11 content-center border-t border-border px-2 text-[hsl(var(--brand))]">{t("リストを管理")}</Link>
    </div>}
  </div>;
}
