import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pb-10">
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <img src="/icon.png" alt="" className="h-24 w-24 rounded-[22px]" />
        <h1 className="text-[30px] font-bold">@yytblue</h1>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-red-500">
          {t(error)}{" "}
          <button type="button" onClick={clearError} className="underline">{t("閉じる")}</button>
        </p>
      ) : null}
      <div className="mt-4 grid gap-3">
        <button
          type="button"
          disabled={isSigningIn}
          onClick={() => beginSignIn("google")}
          className="h-[52px] w-full rounded-full border border-border bg-background text-[17px] font-semibold text-foreground transition active:scale-[0.98] disabled:opacity-40"
        >
          <span className="flex items-center justify-center gap-3">
            <GoogleMark className="h-5 w-5" />
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
