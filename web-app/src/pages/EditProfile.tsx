import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/TweetFeed";
import { useAuth } from "@/hooks/authContext";
import { t } from "@/lib/language";
import { fetchProfile, HANDLE_PATTERN, saveProfile, type Profile } from "@/lib/profiles";

const field = "w-full rounded-lg border border-[#CFD9DE] px-3 py-2 text-[15px] outline-none focus:border-[#1D9BF0]";

function Form({ profile }: { profile: Profile }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string>(profile.name);
  const [handle, setHandle] = useState<string>(profile.handle ?? "");
  const [bio, setBio] = useState<string>(profile.bio);
  const [avatar, setAvatar] = useState<File | null>(null);
  const preview = useMemo<string | null>(() => (avatar ? URL.createObjectURL(avatar) : null), [avatar]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const valid = name.trim().length > 0 && HANDLE_PATTERN.test(handle);
  const save = useMutation({
    mutationFn: () => saveProfile(user?.id ?? "", { name, handle, bio, avatar }),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success(t("プロフィールを保存しました"));
      navigate("/mine");
    },
    onError: (error: unknown) => {
      const code = (error as { code?: string })?.code;
      toast.error(code === "23505" ? t("このハンドルは使われています") : t("保存できませんでした。もう一度試してください。"));
    },
  });
  return (
    <form className="space-y-4 px-4 py-4" onSubmit={(event) => { event.preventDefault(); if (valid) save.mutate(); }}>
      <div className="flex justify-center">
        <button type="button" onClick={() => fileRef.current?.click()} className="relative" aria-label={t("写真を変更")}>
          <Avatar initial={Array.from(name)[0] ?? "あ"} index={0} url={preview ?? profile.avatar_url} size={96} />
          <span className="absolute inset-0 grid place-items-center rounded-full bg-black/35 text-white"><Camera className="h-6 w-6" /></span>
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden
          onChange={(e) => { setAvatar(e.target.files?.[0] ?? null); e.target.value = ""; }} />
      </div>
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
        <textarea value={bio} maxLength={160} rows={4} onChange={(e) => setBio(e.target.value)} className={field} />
        <span className="float-right text-[12px] tabular-nums">{Array.from(bio).length}/160</span>
      </label>
      <button type="submit" disabled={!valid || save.isPending} className="h-11 w-full rounded-full bg-[#0F1419] text-[15px] font-bold text-white disabled:opacity-40">{t("保存")}</button>
    </form>
  );
}

export default function EditProfilePage() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["fullProfile", user?.id],
    queryFn: async () => (user?.id ? await fetchProfile(user.id) : null),
    enabled: Boolean(user?.id),
  });
  return (
    <div className="min-h-dvh bg-[#F7F9F9] text-[#0F1419]">
      <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-white">
        <header className="sticky top-0 z-10 grid h-12 grid-cols-[44px_1fr_44px] items-center border-b border-[#ECF0F2] bg-white px-2">
          <Link to="/mine" className="grid h-11 w-11 place-items-center" aria-label={t("キャンセル")}>
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-center text-[17px] font-bold">{t("プロフィールを編集")}</h1>
          <span />
        </header>
        {query.data ? <Form profile={query.data} /> : <p className="grid min-h-[40vh] place-items-center text-[#536471]">{t("読み込み中…")}</p>}
      </div>
    </div>
  );
}
