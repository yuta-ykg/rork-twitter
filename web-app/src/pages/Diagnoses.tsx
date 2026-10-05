import { PostDiagnosisCard } from "@/components/PostDiagnosisCard";
import { useAuth } from "@/hooks/authContext";
import { t, useLanguage } from "@/lib/language";
import { searchUserDiagnoses, type DiagnosisSearchResult } from "@/lib/diagnoses";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Shell } from "@/pages/IndexShared";

export default function DiagnosesPage() {
  useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [diagnoses, setDiagnoses] = useState<DiagnosisSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const keyword = query.trim();
    setLoading(true);
    setError("");
    const timer = window.setTimeout(() => {
      searchUserDiagnoses(keyword, user?.id)
        .then((results) => { if (!cancelled) setDiagnoses(results); })
        .catch(() => { if (!cancelled) setError("診断を読み込めませんでした。"); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, keyword ? 250 : 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [query, user?.id]);

  return (
    <Shell tab="diagnoses" onCompose={() => navigate("/", { state: { compose: true } })}>
      <div className="pt-4">
        <h1 className="text-[28px] font-bold">{t("診断を探す")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("診断一覧の説明")}</p>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("診断を検索")}
            aria-label={t("診断を検索")}
            className="h-11 w-full rounded-full border border-input bg-muted/60 pl-11 pr-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-[hsl(var(--brand))]"
          />
        </div>
      </div>
      <section className="mt-6" aria-labelledby="diagnosis-results-heading">
        <h2 id="diagnosis-results-heading" className="text-lg font-semibold">{t(query.trim() ? "検索結果" : "新着の診断")}</h2>
        {error ? <p role="alert" className="mt-4 text-sm text-red-500">{t(error)}</p> : null}
        {loading ? <p role="status" className="py-10 text-center text-muted-foreground">{t("読み込み中…")}</p> :
          diagnoses.length ? diagnoses.map(({ diagnosis }) => <PostDiagnosisCard key={diagnosis.id} diagnosis={diagnosis}
            onShared={(post) => navigate(`/post/${post.id}`)} />) :
          <p className="py-10 text-center text-muted-foreground">{t(query.trim() ? "該当する診断がありません。" : "診断がありません。")}</p>}
      </section>
    </Shell>
  );
}
