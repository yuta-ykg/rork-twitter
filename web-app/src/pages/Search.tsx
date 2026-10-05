import { t, useLanguage } from "@/lib/language";
import { toast } from "sonner";
import { Brain, Gamepad2, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/authContext";
import { displayName, userHandle } from "@/hooks/authUser";
import { fetchPosts, insertPost, sortTimeline, setPostLike, type Post } from "@/lib/posts";
import { Shell, Row, ComposeSheet } from "@/pages/IndexShared";
import { useOwnProfile } from "@/hooks/useOwnProfile";
import { isConsumerProtectionSearchQuery, isCrimePreventionSearchQuery, isSupportSearchQuery } from "@/lib/safetySearch";
import { SearchSupportNotice } from "@/components/SearchSupportNotice";
import { CrimePreventionNotice } from "@/components/CrimePreventionNotice";
import { ConsumerProtectionNotice } from "@/components/ConsumerProtectionNotice";
import { PostDiagnosisCard } from "@/components/PostDiagnosisCard";
import type { PollDraft } from "@/lib/polls";
import { searchUserDiagnoses, type DiagnosisDraft, type DiagnosisSearchResult } from "@/lib/diagnoses";
import { Link, useNavigate } from "react-router-dom";

const goalTargets = [1024, 2048, 4096, 8192, 16384] as const;
const miniGames = [
  {
    id: "memory",
    title: "神経衰弱",
    description: "カードの中から同じ絵柄のペアを見つけましょう。",
    keywords: ["神経衰弱", "memory", "memory match", "matching pairs", "짝 맞추기", "같은 그림 찾기", "记忆配对", "記憶配對"],
  },
  {
    id: "shogi",
    title: "将棋",
    description: "同じ端末で交互に指す将棋です。駒の移動・成り・持ち駒・王手と詰みを判定します。",
    keywords: ["将棋", "shogi", "日本将棋", "쇼기", "日本将棋", "将棋游戏"],
  },
  { id: "othello", title: "オセロ", description: "CPUまたは同じ端末で2人対戦できます。", keywords: ["オセロ", "リバーシ", "othello", "reversi"] },
  { id: "go", title: "囲碁", description: "石を取り、パスして終局する9路盤の囲碁です。", keywords: ["囲碁", "igo", "go", "baduk", "weiqi"] },
  { id: "blocks", title: "ブロックパズル", description: "3つのピースを置き、行と列を消してスコアを伸ばすゲームです。", keywords: ["ブロックパズル", "ブロックブラスト", "block blast", "block puzzle"] },
  ...goalTargets.map((target) => ({
    id: target,
    title: String(target),
    description: "矢印キーまたは画面のボタンで数字を合わせ、目標の数字を目指しましょう。",
    keywords: [String(target)],
  })),
] as const;
const gameSearchTerms = ["ゲーム", "game", "mini game", "ゲームセンター", "미니게임", "게임센터", "游戏", "游戏中心", "遊戲", "遊戲中心"];

export default function SearchPage() {
  useLanguage();
  const { user } = useAuth();
  const own = useOwnProfile();
  const [posts, setPosts] = useState<Post[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [open, setOpen] = useState(false);
  const [diagnoses, setDiagnoses] = useState<DiagnosisSearchResult[]>([]);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [diagnosisError, setDiagnosisError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setError("");
    fetchPosts(user?.id)
      .then((next) => { if (!cancelled) setPosts(next); })
      .catch(() => { if (!cancelled) setError("タイムラインを読み込めませんでした。"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id, retry]);

  const keyword = query.trim().toLowerCase();
  const gameResults = useMemo(() => {
    if (keyword.length < 2) return [];
    const matchesTerm = (terms: readonly string[]) => terms.some((term) => term === "go" ? keyword === "go" : term.includes(keyword) || keyword.includes(term));
    if (matchesTerm(gameSearchTerms)) return miniGames;
    return miniGames.filter((game) => matchesTerm(game.keywords));
  }, [keyword]);
  const results = useMemo(() => {
    if (!keyword) return [];
    return sortTimeline(posts).filter((post) =>
      post.body.toLowerCase().includes(keyword)
      || post.authorName.toLowerCase().includes(keyword)
      || post.handle.toLowerCase().includes(keyword));
  }, [posts, keyword]);

  useEffect(() => {
    let cancelled = false;
    if (!keyword) {
      setDiagnoses([]);
      setDiagnosisLoading(false);
      setDiagnosisError("");
      return () => { cancelled = true; };
    }
    setDiagnosisLoading(true);
    setDiagnosisError("");
    const timer = window.setTimeout(() => {
      searchUserDiagnoses(query, user?.id)
        .then((next) => { if (!cancelled) setDiagnoses(next); })
        .catch(() => { if (!cancelled) setDiagnosisError("診断を読み込めませんでした。"); })
        .finally(() => { if (!cancelled) setDiagnosisLoading(false); });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [keyword, query, user?.id]);

  const activeUser = useRef(user?.id);
  activeUser.current = user?.id;
  async function like(id: string) {
    if (!user) { toast.error(t("いいねするにはAppleかGoogleでログインしてください。")); return; }
    const post = posts.find((item) => item.id === id);
    if (!post) return;
    const userId = user.id;
    try {
      const state = await setPostLike(id, !post.isLiked, userId);
      if (activeUser.current === userId) {
        setPosts((current) => current.map((item) => item.id === id ? { ...item, ...state } : item));
      }
    } catch { toast.error(t("いいねを保存できませんでした。もう一度試してください。")); }
  }
  async function add(body: string, poll: PollDraft | null, diagnosis: DiagnosisDraft | null) {
    if (!user) return;
    try {
      const post = await insertPost(body, user, poll, diagnosis);
      if (activeUser.current === user.id) setPosts((current) => [post, ...current]);
    } catch { toast.error(t("投稿できませんでした。もう一度試してください。")); }
  }

  return (
    <>
      <Shell tab="search" onCompose={() => setOpen(true)}>
        <div className="pt-4">
          <h1 className="text-[28px] font-bold">{t("検索")}</h1>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("キーワードで投稿・診断・ゲームを検索")}
              aria-label={t("検索")}
              className="h-11 w-full rounded-full border border-input bg-muted/60 pl-11 pr-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-[hsl(var(--brand))]"
            />
          </div>
        </div>
        {isSupportSearchQuery(query) ? <SearchSupportNotice /> : null}
        {isCrimePreventionSearchQuery(query) ? <CrimePreventionNotice /> : null}
        {isConsumerProtectionSearchQuery(query) ? <ConsumerProtectionNotice /> : null}
        {error ? <p role="alert" className="mt-4 text-sm text-red-500">{t(error)}</p> : null}
        {!keyword ? <p className="py-10 text-center text-muted-foreground">{t("ユーザー名や本文のキーワードで投稿を探せます。診断のほか、ゲーム名からゲームセンターを開けます。")}</p> : <>
          {gameResults.length ? <section className="mt-5" aria-labelledby="search-games-heading">
            <h2 id="search-games-heading" className="text-lg font-semibold">{t("ゲームセンター")}</h2>
            <div className="mt-2 grid gap-2">
              {gameResults.map((game) => <Link key={game.id} to={`/games?game=${game.id}`} className="flex min-h-16 items-center gap-3 rounded-xl border border-border px-4 py-3 transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[hsl(var(--brand))]/10 text-[hsl(var(--brand))]">
                  {game.id === "memory" ? <Brain className="h-5 w-5" aria-hidden /> : <Gamepad2 className="h-5 w-5" aria-hidden />}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{t(game.title)}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{t(game.description)}</span>
                </span>
              </Link>)}
            </div>
          </section> : null}
          <section className="mt-5" aria-labelledby="search-diagnoses-heading">
            <h2 id="search-diagnoses-heading" className="text-lg font-semibold">{t("診断")}</h2>
            {diagnosisError ? <p role="alert" className="mt-3 text-sm text-red-500">{t(diagnosisError)}</p> : null}
            {diagnosisLoading ? <p role="status" className="py-6 text-center text-muted-foreground">{t("読み込み中…")}</p> :
              diagnoses.length ? diagnoses.map(({ diagnosis }) => <PostDiagnosisCard key={diagnosis.id} diagnosis={diagnosis}
                onShared={(post) => navigate(`/post/${post.id}`)} />) :
              <p className="py-6 text-center text-sm text-muted-foreground">{t("該当する診断がありません。")}</p>}
          </section>
          <section className="mt-5" aria-labelledby="search-posts-heading">
            <h2 id="search-posts-heading" className="text-lg font-semibold">{t("投稿")}</h2>
            {loading ? <p role="status" className="py-6 text-center text-muted-foreground">{t("読み込み中…")}</p> :
              results.length ? results.map((post) => <Row key={post.id} post={post} showAuthor onLike={() => like(post.id)} />) :
              <p className="py-6 text-center text-sm text-muted-foreground">{t("該当する投稿がありません。")}</p>}
          </section>
        </>}
      </Shell>
      {open && user ? <ComposeSheet onClose={() => setOpen(false)} onPost={add}
        authorName={own?.name ?? displayName(user)} handle={own?.handle ?? userHandle(user)} initial={own?.initial ?? displayName(user).slice(0, 1)} /> : null}
    </>
  );
}
