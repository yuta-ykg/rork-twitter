import { useEffect, useState } from "react";
import { deleteAccount } from "@/lib/account";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { isGuestSession } from "@/lib/development";
import { listUserRelationships, setUserRelationship, type UserRelationship } from "@/lib/userRelationships";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { useDesktopNavigation } from "@/hooks/useDesktopNavigation";
import { useBottomBarLabels } from "@/hooks/useBottomBarLabels";
import { Switch } from "@/components/ui/switch";
import { t, useLanguage } from "@/lib/language";
import { likeIconOptions, useLikeIcon, type LikeIcon } from "@/hooks/useLikeIcon";
import { Link, useNavigate } from "react-router-dom";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { themeOptions, useTheme, type Theme } from "@/hooks/useTheme";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [relationships, setRelationships] = useState<UserRelationship[]>([]);
  const [relationshipError, setRelationshipError] = useState("");
  const [relationshipBusy, setRelationshipBusy] = useState(false);
  useEffect(() => { let cancelled = false; setRelationships([]); if (user) listUserRelationships(user.id).then((rows) => { if (!cancelled) setRelationships(rows); }).catch(() => { if (!cancelled) setRelationshipError("設定を読み込めませんでした。"); }); return () => { cancelled = true; }; }, [user?.id]);
  async function removeRelationship(row: UserRelationship) { if (!user || relationshipBusy) return; setRelationshipBusy(true); setRelationshipError(""); try { await setUserRelationship(user.id, row.target_id, row.kind, false); setRelationships((rows) => rows.filter((item) => !(item.kind === row.kind && item.target_id === row.target_id))); } catch { setRelationshipError("設定を保存できませんでした。"); } finally { setRelationshipBusy(false); } }
  const { showBottomBarLabels, setShowBottomBarLabels } = useBottomBarLabels();
  const navigate = useNavigate();
  const { useDesktopBottomBar, setUseDesktopBottomBar } = useDesktopNavigation();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { likeIcon, setLikeIcon } = useLikeIcon();
  return <div className={`mx-auto min-h-dvh w-full max-w-[430px] bg-background text-foreground ${useDesktopBottomBar ? "" : "lg:max-w-[760px] lg:pl-[220px]"}`}>
    {!useDesktopBottomBar && <DesktopSidebar tab="settings" onCompose={() => navigate("/", { state: { compose: true } })} />}
    <main className="px-5 pb-10">
    <header className="flex min-h-14 items-center gap-5 border-b border-border">
      <Link to="/" className="flex min-h-11 items-center text-[hsl(var(--brand))]">{t("ホーム")}</Link>
      <h1 className="text-lg font-semibold">{t("設定")}</h1>
    </header>
    <section className="py-6">
      <h2 className="text-xl font-semibold">{t("アカウント")}</h2>
      {user ? (
        <>
          <p className="mt-4 text-sm text-muted-foreground">{t("メールアドレス")}</p>
          <p className="mt-1 break-all text-base">{isGuestSession() ? t("ゲスト") : (user.email || t("未設定"))}</p>
          {isGuestSession() ? <p className="mt-1 text-sm text-muted-foreground">{t("アカウント登録なしで試せます。データはこの端末にだけ保存され、30日で削除されます。")}</p> : null}
          {deleteError ? <p role="alert" className="mt-3 text-sm text-red-600">{t(deleteError)}</p> : null}
          <AlertDialog open={confirmOpen} onOpenChange={(open) => { if (!deleting) setConfirmOpen(open); }}>
            <AlertDialogTrigger asChild>
              <button type="button" disabled={deleting}
                className="mt-4 min-h-11 rounded-full border border-red-200 px-4 text-base font-semibold text-red-600 disabled:opacity-50">
                {deleting ? t("削除中…") : t("アカウントを削除")}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("アカウントを削除しますか？")}</AlertDialogTitle>
                <AlertDialogDescription>{t("投稿、プロフィール、いいね、ブックマーク、通知が削除されます。この操作は取り消せません。")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>{t("キャンセル")}</AlertDialogCancel>
                <AlertDialogAction disabled={deleting} className="bg-red-600 text-white hover:bg-red-700"
                  onClick={(event) => {
                    event.preventDefault();
                    if (!user || deleting) return;
                    const userId = user.id;
                    setDeleting(true);
                    setDeleteError("");
                    void deleteAccount(userId)
                      .then(() => { setConfirmOpen(false); signOut(); })
                      .catch(() => { setConfirmOpen(false); setDeleteError("アカウントを削除できませんでした。"); })
                      .finally(() => setDeleting(false));
                  }}>
                  {deleting ? t("削除中…") : t("削除する")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button type="button"
                className="mt-3 min-h-11 rounded-full border border-border px-4 text-base font-semibold">
                {t("ログアウト")}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("ログアウトしますか？")}</AlertDialogTitle>
                <AlertDialogDescription>{t("この端末からサインアウトします。もう一度ログインできます。")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("キャンセル")}</AlertDialogCancel>
                <AlertDialogAction onClick={() => signOut()}>{t("ログアウト")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : <p className="mt-4 text-muted-foreground">{t("ログインしていません。")}</p>}
    </section>
    <section className="border-t border-border py-6">
      <h2 id="theme-label" className="text-xl font-semibold">{t("外観")}</h2>
      <p className="mb-5 mt-2 text-base text-muted-foreground">{t("システムを選ぶと端末の外観設定に合わせて切り替わります。")}</p>
      <RadioGroup aria-labelledby="theme-label" value={theme} onValueChange={(value) => setTheme(value as Theme)}>
        {themeOptions.map((option) => <label key={option.value} htmlFor={`theme-${option.value}`}
          className="flex min-h-14 cursor-pointer items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-base">
          {t(option.label)}<RadioGroupItem id={`theme-${option.value}`} value={option.value} />
        </label>)}
      </RadioGroup>
    </section>
    <section className="border-t border-border py-6">
      <h2 id="desktop-navigation-label" className="mb-5 text-xl font-semibold">{t("ナビゲーション")}</h2>
      <p className="mb-4 text-base text-muted-foreground">{t("デスクトップでは左側サイドバーを使用します。モバイルではボトムバーを使用します。")}</p>
      <RadioGroup aria-labelledby="desktop-navigation-label" value={useDesktopBottomBar ? "bottom" : "sidebar"} onValueChange={(value) => setUseDesktopBottomBar(value === "bottom")} className="mb-5">
        {[{ value: "sidebar", label: "左側サイドバー（デスクトップ）" }, { value: "bottom", label: "ボトムバー（デスクトップ）" }].map((option) => <label key={option.value} htmlFor={`desktop-navigation-${option.value}`}
          className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-base">
          {t(option.label)}<RadioGroupItem id={`desktop-navigation-${option.value}`} value={option.value} />
        </label>)}
      </RadioGroup>
      <div className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
        <label htmlFor="bottom-bar-labels" className="cursor-pointer text-base">{t("ボトムバーの文字を表示")}</label>
        <Switch id="bottom-bar-labels" checked={showBottomBarLabels} onCheckedChange={setShowBottomBarLabels} />
      </div>
    </section>
    <section className="border-t border-border py-6">
      <h2 id="like-icon-label" className="text-xl font-semibold">{t("いいねアイコン")}</h2>
      <p className="mb-5 mt-2 text-base text-muted-foreground">{t("いいねの表示に使うアイコンを選べます。")}</p>
      <RadioGroup aria-labelledby="like-icon-label" value={likeIcon} onValueChange={(value) => setLikeIcon(value as LikeIcon)}>
        {likeIconOptions.map(({ value, label, Icon }) => <label key={value} htmlFor={`like-icon-${value}`}
          className="flex min-h-14 cursor-pointer items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-base">
          <span className="inline-flex items-center gap-3"><Icon className="h-5 w-5" aria-hidden />{t(label)}</span>
          <RadioGroupItem id={`like-icon-${value}`} value={value} />
        </label>)}
      </RadioGroup>
    </section>
    {user && <section className="border-t border-border py-6">
      <h2 className="mb-4 text-xl font-semibold">{t("ミュート・ブロック中のアカウント")}</h2>
      {relationshipError && <p role="alert" className="text-red-600">{t(relationshipError)}</p>}
      {relationships.length === 0 ? <p className="text-muted-foreground">{t("登録されたアカウントはありません。")}</p> : relationships.map((row) =>
        <div key={row.kind + row.target_id} className="flex min-h-14 items-center justify-between gap-3 border-b border-border py-2">
          <span className="min-w-0 break-words">{row.target_name} <span className="text-sm text-muted-foreground">({t(row.kind === "mute" ? "ミュート" : "ブロック")})</span></span>
          <button type="button" disabled={relationshipBusy} onClick={() => void removeRelationship(row)}
            className="min-h-11 shrink-0 text-[hsl(var(--brand))] disabled:opacity-50">{t("解除")}</button>
        </div>)}
    </section>}
    <section className="border-t border-border py-6">
      <h2 id="language-label" className="mb-5 text-xl font-semibold">{t("言語")}</h2>
      <RadioGroup aria-labelledby="language-label" value={language} onValueChange={(value) => setLanguage(value === "en" ? "en" : "ja")}>
        {[{ value: "ja", label: "日本語" }, { value: "en", label: "English" }].map((option) => <label key={option.value} htmlFor={`language-${option.value}`}
          className="flex min-h-14 cursor-pointer items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-base">
          {option.label}<RadioGroupItem id={`language-${option.value}`} value={option.value} />
        </label>)}
      </RadioGroup>
    </section>
    </main>
  </div>;
}
