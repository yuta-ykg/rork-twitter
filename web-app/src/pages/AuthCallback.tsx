import { t, useLanguage } from "@/lib/language";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";

export default function AuthCallback() {
  useLanguage();
  const { exchangeCode } = useAuth();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) {
      navigate("/", { replace: true });
      return;
    }
    void exchangeCode(code).finally(() => navigate("/", { replace: true }));
  }, [exchangeCode, navigate]);

  return <div className="grid min-h-dvh place-items-center text-[#536471]">{t("ログインしています…")}</div>;
}
