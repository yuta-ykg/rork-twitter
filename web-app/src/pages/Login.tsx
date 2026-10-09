import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Fish } from "lucide-react";

import { AppleMark, GoogleMark } from "@/components/BrandMarks";
import Onboarding, { ONBOARDED_KEY } from "@/components/Onboarding";
import { useAuth } from "@/hooks/authContext";
import { t, useLanguage } from "@/lib/language";

export default function LoginPage() {
  useLanguage();
  const { user, isSigningIn, error, signIn, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [onboarded, setOnboarded] = useState<boolean>(() => localStorage.getItem(ONBOARDED_KEY) === "1");
  const stateFrom = (location.state as { from?: unknown } | null)?.from;
  const returnPath = typeof stateFrom === "string" && stateFrom.startsWith("/") && !stateFrom.startsWith("//") ? stateFrom : "/";

  useEffect(() => {
    if (user) navigate(returnPath, { replace: true });
  }, [user, navigate, returnPath]);

  function beginSignIn(provider: "google" | "apple") {
    sessionStorage.setItem("iruka:auth_return_to", returnPath);
    void signIn(provider);
  }

  if (!onboarded && !user) {
    return (
      <Onboarding
        onDone={() => {
          localStorage.setItem(ONBOARDED_KEY, "1");
          setOnboarded(true);
        }}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center px-6 pb-10">
      <div className="mb-8 flex items-center gap-2">
        <Fish className="h-7 w-7 text-[hsl(var(--brand))]" aria-hidden />
        <h1 className="text-2xl font-bold">{t("イルカ")}</h1>
      </div>
      <h2 className="text-[28px] font-bold leading-tight">{t("ログインしてはじめる")}</h2>
      <p className="mt-2 text-base text-muted-foreground">{t("投稿するには、GoogleかAppleで入ってください。")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("パスワード不要・数秒で完了します。")}</p>
      {error ? (
        <p className="mt-3 text-sm text-red-500">
          {t(error)}{" "}
          <button type="button" onClick={clearError} className="underline">{t("閉じる")}</button>
        </p>
      ) : null}
      <div className="mt-6 grid gap-3">
        <button
          type="button"
          disabled={isSigningIn}
          onClick={() => beginSignIn("google")}
          className="h-[52px] w-full rounded-full bg-[hsl(var(--brand))] text-[17px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
        >
          <span className="flex items-center justify-center gap-3">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-background">
              <GoogleMark className="h-[18px] w-[18px]" />
            </span>
            {isSigningIn ? t("ログイン中…") : t("Googleで続ける")}
          </span>
        </button>
        <button
          type="button"
          disabled={isSigningIn}
          onClick={() => beginSignIn("apple")}
          className="h-[52px] w-full rounded-full bg-black text-[17px] font-semibold text-white disabled:opacity-40"
        >
          <span className="flex items-center justify-center gap-3">
            <AppleMark className="h-5 w-5" />
            {t("Appleで続ける")}
          </span>
        </button>
      </div>
    </div>
  );
}
