import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TweetShell, Avatar } from "@/components/TweetFeed";
import { useAuth } from "@/hooks/authContext";
import { supabase } from "@/lib/supabase";
import { fetchProfile, fetchProfiles } from "@/lib/profiles";
import { t } from "@/lib/language";

export default function MessagesPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  return <TweetShell title="メッセージ" tab="messages">{user ? <DirectMessages key={`${user.id}:${params.get("to") ?? ""}`} userId={user.id} peer={params.get("to") ?? ""} close={() => setParams({})} /> : <Link to="/login" className="block p-4">{t("ログイン")}</Link>}</TweetShell>;
}

function DirectMessages({ userId, peer, close }: { userId: string; peer: string; close: () => void }) {
  const client = useQueryClient();
  const [body, setBody] = useState<string>("");
  const [retryId, setRetryId] = useState<string | null>(null);
  const inbox = useQuery({ queryKey: ["dm-inbox", userId], queryFn: async () => {
    const { data, error } = await supabase.rpc("dm_inbox", { expected_user_id: userId });
    if (error) throw error;
    const profiles = await fetchProfiles((data ?? []).map((row) => row.peer_id));
    return (data ?? []).map((row) => ({ ...row, profile: profiles.find((p) => p.id === row.peer_id) }));
  }, refetchInterval: 5000 });
  const profile = useQuery({ queryKey: ["dm-peer", peer], queryFn: () => fetchProfile(peer), enabled: !!peer });
  const messages = useQuery({ queryKey: ["dm-thread", userId, peer], queryFn: async () => {
    const { data, error } = await supabase.rpc("dm_read", { expected_user_id: userId, target_id: peer });
    if (error) throw error;
    return data ?? [];
  }, enabled: !!peer, refetchInterval: 3000 });
  const mode = useQuery({ queryKey: ["dm-mode", userId], queryFn: async () => {
    const { data, error } = await supabase.rpc("dm_receive_mode", { expected_user_id: userId });
    if (error) throw error;
    return data;
  } });
  const changeMode = useMutation({ mutationFn: async (value: string) => {
    const { error } = await supabase.rpc("dm_receive_mode", { expected_user_id: userId, new_mode: value });
    if (error) throw error;
  }, onSuccess: () => { void client.invalidateQueries({ queryKey: ["dm-mode", userId] }); } });
  useEffect(() => {
    if (!peer || !messages.data?.length || document.visibilityState !== "visible") return;
    const through = messages.data[0].created_at;
    void supabase.rpc("dm_mark_read", { expected_user_id: userId, target_id: peer, through_time: through }).then(({ error }) => {
      if (!error) void client.invalidateQueries({ queryKey: ["dm-inbox", userId] });
    });
  }, [messages.data, peer, userId, client]);
  const send = useMutation({ mutationFn: async () => {
    const id = retryId ?? crypto.randomUUID();
    setRetryId(id);
    const { error } = await supabase.rpc("dm_send", { expected_user_id: userId, target_id: peer, message_id: id, message_body: body });
    if (error) throw error;
  }, onSuccess: () => {
    setBody(""); setRetryId(null);
    void client.invalidateQueries({ queryKey: ["dm-thread", userId, peer] });
    void client.invalidateQueries({ queryKey: ["dm-inbox", userId] });
  } });
  const errorText = <p role="alert" className="p-3 text-sm text-red-600">{t("DMを処理できませんでした。受信設定や接続を確認してください。")}</p>;
  if (!peer) return <div>
    <section className="space-y-2 border-b border-border p-4"><label className="block text-sm font-bold" htmlFor="dm-mode">{t("DMの受信範囲")}</label>
      <select id="dm-mode" value={mode.data ?? "mutual"} disabled={!mode.data || changeMode.isPending} onChange={(e) => changeMode.mutate(e.target.value)} className="min-h-11 w-full rounded-lg border border-border bg-background px-3">
        {[["all", "全員"], ["following", "自分がフォローしている相手"], ["mutual", "相互フォロー"], ["none", "受信しない"]].map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
      </select>{(mode.isError || changeMode.isError) && errorText}
      <p className="text-sm text-muted-foreground">{t("相手のプロフィールからメッセージを開始できます。")}</p>
    </section>
    {inbox.isPending && <p className="p-4">{t("読み込み中…")}</p>}{inbox.isError && errorText}
    {inbox.data?.length === 0 && <p className="p-4 text-muted-foreground">{t("メッセージはありません")}</p>}
    {inbox.data?.map((row) => <Link key={row.peer_id} to={`/messages?to=${encodeURIComponent(row.peer_id)}`} className="flex min-h-20 gap-3 border-b border-border p-4">
      <Avatar initial={row.profile?.name?.[0] ?? "?"} index={0} url={row.profile?.avatar_url} size={40} />
      <div className="min-w-0 flex-1"><p className="font-bold">{row.profile?.name ?? row.peer_id}</p><p className="truncate text-sm text-muted-foreground">{row.body}</p><time className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</time></div>
      {row.unread_count > 0 && <span className="self-start rounded-full bg-[#1D9BF0] px-2 text-sm text-white">{row.unread_count}</span>}
    </Link>)}
  </div>;
  return <div className="flex flex-col">
    <header className="flex items-center gap-3 border-b border-border p-3"><button onClick={close} className="min-h-11 px-3">{t("戻る")}</button><Link to={`/u/${encodeURIComponent(peer)}`} className="flex min-h-11 items-center font-bold">{profile.data?.name ?? peer}</Link></header>
    <div className="space-y-3 p-4">{messages.isError && errorText}{messages.isPending && <p>{t("読み込み中…")}</p>}
      {[...(messages.data ?? [])].reverse().map((message) => <div key={message.id} className={`flex flex-col ${message.sender_id === userId ? "items-end" : "items-start"}`}><p className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 ${message.sender_id === userId ? "bg-[#1D9BF0] text-white" : "bg-[#F7F9F9] text-[#0F1419]"}`}>{message.body}</p><span className="mt-1 text-xs text-muted-foreground">{new Date(message.created_at).toLocaleString()} {message.sender_id === userId && message.read_at ? t("既読") : ""}</span></div>)}
    </div>
    <form onSubmit={(e) => { e.preventDefault(); send.mutate(); }} className="space-y-2 border-t border-border p-3">
      <textarea aria-label={t("メッセージ")} value={body} disabled={send.isPending} onChange={(e) => { setBody(e.target.value); setRetryId(null); }} className="min-h-20 w-full resize-y rounded-xl border border-border p-3" />
      <div className="flex items-center justify-between"><span className={Array.from(body.trim()).length > 2000 ? "text-red-600" : "text-muted-foreground"}>{Array.from(body.trim()).length} / 2000</span><button disabled={!body.trim() || Array.from(body.trim()).length > 2000 || send.isPending} className="min-h-11 rounded-full bg-[#1D9BF0] px-5 font-bold text-white disabled:opacity-50">{send.isPending ? t("送信中…") : send.isError ? t("再送") : t("送信")}</button></div>
      {send.isError && errorText}
    </form>
  </div>;
}
