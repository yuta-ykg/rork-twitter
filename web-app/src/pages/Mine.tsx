import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Avatar, TweetList, useTimeline } from "@/components/TweetFeed";
import { useAuth } from "@/hooks/authContext";
import { useOwnProfile } from "@/hooks/useOwnProfile";
import { t, useLanguage } from "@/lib/language";
import { fetchProfile, HANDLE_PATTERN, saveProfile, type Profile } from "@/lib/profiles";

function joined(iso: string | null, lang: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(lang === "ja" ? "ja-JP" : undefined, { year: "numeric", month: "long" });
}

function EditForm({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState<string>(profile.name);
  const [handle, setHandle] = useState<string>(profile.handle ?? "");
  const [bio, setBio] = useState<string>(profile.bio);
  const valid = name.trim().length > 0 && HANDLE_PATTERN.test(handle);
  const save = useMutation({
    mutationFn: () => saveProfile(user?.id ?? "", { name, handle, bio }),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success(t("プロフィールを保存しました"));
      onDone();
    },
    onError: (error: unknown) => {
      const code = (error as { code?: string })?.code;
      toast.error(code === "23505" ? t("このハンドルは使われています") : t("保存できませんでした。もう一度試してください。"));
    },
  });
  const field = "w-full rounded-lg border border-[#CFD9DE] px-3 py-2 text-[15px] outline-none focus:border-[#1D9BF0]";
  return (
    <form
      className="space-y-3 border-b border-[#ECF0F2] px-4 pb-4"
      onSubmit={(event) => { event.preventDefault(); if (valid) save.mutate(); }}
    >
      <label className="block text-[13px] text-[#536471]">{t("名前")}
        <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className={field} />
      </label>
      <label className="block text-[13px] text-[#536471]">{t("ハンドル")}
        <div className="flex items-center gap-1">
          <span className="text-[15px] text-[#536471]">@</span>
          <input value={handle} maxLength={25} autoCapitalize="none" onChange={(e) => setHandle(e.target.value.toLowerCase())} className={field} />
        </div>
        {handle && !HANDLE_PATTERN.test(handle) ? <span className="text-[12px] text-[#F4212E]">{t("英小文字・数字・_ の3〜25文字")}</span> : null}
      </label>
      <label className="block text-[13px] text-[#536471]">{t("自己紹介")}
        <textarea value={bio} maxLength={160} rows={3} onChange={(e) => setBio(e.target.value)} className={field} />
        <span className="float-right text-[12px] tabular-nums">{Array.from(bio).length}/160</span>
      </label>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={!valid || save.isPending} className="h-10 rounded-full bg-[#0F1419] px-5 text-[15px] font-bold text-white disabled:opacity-40">{t("保存")}</button>
        <button type="button" onClick={onDone} className="h-10 rounded-full border border-[#CFD9DE] px-5 text-[15px] font-bold">{t("キャンセル")}</button>
      </div>
    </form>
  );
}

export default function MinePage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const own = useOwnProfile();
  const timeline = useTimeline();
  const [editing, setEditing] = useState<boolean>(false);
  const profileQuery = useQuery({
    queryKey: ["fullProfile", user?.id],
    queryFn: async () => (user?.id ? await fetchProfile(user.id) : null),
    enabled: Boolean(user?.id),
  });
  const mine = (timeline.data ?? []).filter((post) => post.isMine);
  const profile = profileQuery.data;
  const name = profile?.name ?? own?.name ?? "";
  const handle = profile?.handle ? `@${profile.handle}` : own?.handle ?? "";
  return (
    <div className="min-h-dvh bg-[#F7F9F9] text-[#0F1419]">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-white">
        <header className="sticky top-0 z-10 grid h-12 grid-cols-[44px_1fr_44px] items-center border-b border-[#ECF0F2] bg-white px-2">
          <Link to="/" className="grid h-11 w-11 place-items-center" aria-label={t("ホーム")}>
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-center text-[17px] font-bold">{name}</h1>
          <span />
        </header>
        <section className="px-4 pb-4 pt-4">
          <div className="flex items-start justify-between">
            <Avatar initial={own?.initial ?? "あ"} index={0} url={own?.avatar} size={72} />
            {profile && !editing ? (
              <button type="button" onClick={() => setEditing(true)} className="h-9 rounded-full border border-[#CFD9DE] px-4 text-[14px] font-bold active:bg-[#F7F9F9]">
                {t("プロフィールを編集")}
              </button>
            ) : null}
          </div>
          <h2 className="mt-3 text-[20px] font-extrabold leading-6">{name}</h2>
          <p className="text-[15px] text-[#536471]">{handle}</p>
          {profile?.bio ? <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-5">{profile.bio}</p> : null}
          <div className="mt-3 flex items-center gap-4 text-[14px] text-[#536471]">
            {profile?.created_at ? (
              <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" aria-hidden />{joined(profile.created_at, language)}{t("から利用")}</span>
            ) : null}
            <span><b className="text-[#0F1419]">{mine.length}</b> {t("投稿")}</span>
          </div>
        </section>
        {editing && profile ? <EditForm profile={profile} onDone={() => setEditing(false)} /> : null}
        <div className="border-b border-t border-[#ECF0F2] py-3 text-center text-[15px] font-bold">{t("投稿")}</div>
        {timeline.isLoading ? <p className="grid min-h-[40vh] place-items-center text-[#536471]">{t("読み込み中…")}</p> : null}
        {timeline.data ? <TweetList posts={mine} empty="まだ投稿がありません" /> : null}
      </div>
    </div>
  );
}
