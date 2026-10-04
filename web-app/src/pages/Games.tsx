import { useAuth } from "@/hooks/authContext";
import { t, useLanguage } from "@/lib/language";
import { insertPost } from "@/lib/posts";
import { Shell } from "@/pages/IndexShared";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Brain, Crown, Gamepad2, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ShogiGame } from "@/components/ShogiGame";

const goalTargets = [1024, 2048, 4096, 8192, 16384] as const;
type GoalTarget = typeof goalTargets[number];
type MiniGame = "memory" | "shogi" | GoalTarget;
type MemoryCard = { id: number; symbol: string };
type Direction = "left" | "right" | "up" | "down";

const memorySymbols = ["🐬", "🐟", "🐙", "🐢", "🦀", "🐳", "🪼", "🦭"];
const tileColors: Record<number, string> = {
  0: "#cdc1b4", 2: "#eee4da", 4: "#ede0c8", 8: "#f2b179", 16: "#f59563",
  32: "#f67c5f", 64: "#f65e3b", 128: "#edcf72", 256: "#edcc61", 512: "#edc850",
  1024: "#edc53f", 2048: "#edc22e", 4096: "#e9bd32", 8192: "#e9b52c", 16384: "#e8ac22",
};

function shuffledMemoryCards(): MemoryCard[] {
  const symbols = [...memorySymbols, ...memorySymbols];
  for (let index = symbols.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [symbols[index], symbols[other]] = [symbols[other], symbols[index]];
  }
  return symbols.map((symbol, id) => ({ id, symbol }));
}

function mergeLine(line: number[]): { line: number[]; gained: number } {
  const values = line.filter((value) => value > 0);
  const merged: number[] = [];
  let gained = 0;
  for (let index = 0; index < values.length; index++) {
    if (values[index] === values[index + 1]) {
      const doubled = values[index] * 2;
      merged.push(doubled);
      gained += doubled;
      index++;
    } else merged.push(values[index]);
  }
  return { line: [...merged, ...Array(4 - merged.length).fill(0)], gained };
}

function move2048(board: number[][], direction: Direction): { board: number[][]; gained: number } {
  const next = board.map((row) => [...row]);
  let gained = 0;
  for (let outer = 0; outer < 4; outer++) {
    const coordinates = Array.from({ length: 4 }, (_, inner) => direction === "left" ? [outer, inner]
      : direction === "right" ? [outer, 3 - inner]
        : direction === "up" ? [inner, outer] : [3 - inner, outer]);
    const merged = mergeLine(coordinates.map(([row, col]) => board[row][col]));
    gained += merged.gained;
    coordinates.forEach(([row, col], index) => { next[row][col] = merged.line[index]; });
  }
  return { board: next, gained };
}

function addRandomTile(board: number[][]): number[][] {
  const empty: Array<[number, number]> = [];
  board.forEach((row, r) => row.forEach((value, c) => { if (value === 0) empty.push([r, c]); }));
  if (!empty.length) return board;
  const [row, col] = empty[Math.floor(Math.random() * empty.length)];
  const next = board.map((line) => [...line]);
  next[row][col] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function new2048Board(): number[][] {
  return addRandomTile(addRandomTile(Array.from({ length: 4 }, () => Array(4).fill(0))));
}

function canMove2048(board: number[][]): boolean {
  if (board.some((row) => row.includes(0))) return true;
  for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
    if (col < 3 && board[row][col] === board[row][col + 1]) return true;
    if (row < 3 && board[row][col] === board[row + 1][col]) return true;
  }
  return false;
}

export default function GamesPage() {
  useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selected, setSelected] = useState<MiniGame>(() => {
    const requestedGame = searchParams.get("game");
    if (requestedGame === "shogi") return "shogi";
    const requestedTarget = Number(requestedGame);
    return goalTargets.includes(requestedTarget as GoalTarget) ? requestedTarget as GoalTarget : "memory";
  });

  async function shareResult(body: string) {
    if (!user) {
      toast.error(t("ゲーム結果を投稿するにはログインしてください。"));
      return;
    }
    try {
      const post = await insertPost(body, user);
      toast.success(t("ゲーム結果を投稿しました。"));
      navigate(`/post/${post.id}`);
    } catch {
      toast.error(t("ゲーム結果を投稿できませんでした。"));
    }
  }

  return (
    <Shell tab="games" onCompose={() => navigate("/", { state: { compose: true } })}>
      <div className="pt-4">
        <h1 className="flex items-center gap-2 text-[28px] font-bold"><Gamepad2 className="h-7 w-7 text-[hsl(var(--brand))]" />{t("ゲームセンター")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("ゲームのスコアや対局結果を投稿で共有できます。")}</p>
        <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label={t("ゲームを選択")}>
          <button type="button" aria-pressed={selected === "memory"} onClick={() => setSelected("memory")}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${selected === "memory" ? "border-[hsl(var(--brand))] bg-[hsl(var(--brand))]/10 text-[hsl(var(--brand))]" : "border-input text-muted-foreground"}`}>
            <Brain className="h-4 w-4" />{t("神経衰弱")}
          </button>
          {goalTargets.map((target) => <button key={target} type="button" aria-pressed={selected === target} onClick={() => setSelected(target)}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${selected === target ? "border-[hsl(var(--brand))] bg-[hsl(var(--brand))]/10 text-[hsl(var(--brand))]" : "border-input text-muted-foreground"}`}>
            <span className="font-bold">{target}</span>
          </button>)}
          <button type="button" aria-pressed={selected === "shogi"} onClick={() => setSelected("shogi")}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${selected === "shogi" ? "border-[hsl(var(--brand))] bg-[hsl(var(--brand))]/10 text-[hsl(var(--brand))]" : "border-input text-muted-foreground"}`}>
            <Crown className="h-4 w-4" aria-hidden />{t("将棋")}
          </button>
        </div>
      </div>
      <section className="mt-5 rounded-2xl border border-border bg-card p-4 sm:p-5" aria-live="polite">
        {selected === "memory" ? <MemoryGame onShare={(body) => void shareResult(body)} /> : selected === "shogi" ? <ShogiGame onShare={(body) => void shareResult(body)} /> : <Game2048 key={selected} target={selected} onShare={(body) => void shareResult(body)} />}
      </section>
    </Shell>
  );
}

function MemoryGame({ onShare }: { onShare: (body: string) => void }) {
  const [cards, setCards] = useState(shuffledMemoryCards);
  const [selected, setSelected] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(() => new Set());
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [locked, setLocked] = useState(false);
  const timeout = useRef<number | null>(null);
  const complete = matched.size === cards.length;

  useEffect(() => {
    if (!started || complete) return;
    const interval = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [started, complete]);
  useEffect(() => () => { if (timeout.current !== null) window.clearTimeout(timeout.current); }, []);

  function restart() {
    if (timeout.current !== null) window.clearTimeout(timeout.current);
    setCards(shuffledMemoryCards());
    setSelected([]);
    setMatched(new Set());
    setMoves(0);
    setSeconds(0);
    setStarted(false);
    setLocked(false);
  }

  function reveal(id: number) {
    if (locked || selected.includes(id) || matched.has(id) || complete) return;
    setStarted(true);
    const next = [...selected, id];
    setSelected(next);
    if (next.length < 2) return;
    setMoves((value) => value + 1);
    if (cards[next[0]].symbol === cards[next[1]].symbol) {
      setMatched((current) => new Set([...current, ...next]));
      setSelected([]);
    } else {
      setLocked(true);
      timeout.current = window.setTimeout(() => { setSelected([]); setLocked(false); }, 700);
    }
  }

  return <div>
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-xl font-bold">{t("神経衰弱")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("カードの中から同じ絵柄のペアを見つけましょう。")}</p></div>
      <button type="button" onClick={restart} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-input" aria-label={t("新しいゲーム")}><RotateCcw className="h-4 w-4" /></button>
    </div>
    <div className="mt-4 flex gap-5 text-sm"><span>{t("手数")} <strong>{moves}</strong></span><span>{t("経過時間")} <strong>{seconds}{t("秒")}</strong></span></div>
    <div className="mt-4 grid grid-cols-4 gap-2" role="group" aria-label={t("神経衰弱")}>
      {cards.map((card, index) => {
        const faceUp = selected.includes(index) || matched.has(index);
        return <button key={card.id} type="button" aria-label={`${t("カード")} ${index + 1} ${faceUp ? card.symbol : t("裏返し")}`}
          aria-pressed={faceUp} onClick={() => reveal(index)} className={`aspect-square rounded-xl text-2xl font-semibold transition sm:text-3xl ${matched.has(index) ? "bg-emerald-100 text-emerald-800" : faceUp ? "bg-[hsl(var(--brand))]/10 text-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
          {faceUp ? card.symbol : "?"}
        </button>;
      })}
    </div>
    {complete ? <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-center text-sm text-emerald-900">
      <p className="font-semibold">{t("クリアしました！")}</p>
      <p className="mt-1">{t("手数")} {moves} · {t("経過時間")} {seconds}{t("秒")}</p>
      <button type="button" onClick={() => onShare(`${t("神経衰弱をクリアしました！")} ${moves}${t("手数")}・${seconds}${t("秒")}`)} className="mt-3 min-h-11 rounded-full bg-[hsl(var(--brand))] px-4 text-sm font-semibold text-white">{t("結果を投稿で共有")}</button>
    </div> : null}
  </div>;
}

function Game2048({ target, onShare }: { target: GoalTarget; onShare: (body: string) => void }) {
  const [board, setBoard] = useState(new2048Board);
  const [score, setScore] = useState(0);
  const [ended, setEnded] = useState(false);
  const [won, setWon] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function restart() { setBoard(new2048Board()); setScore(0); setEnded(false); setWon(false); }
  function move(direction: Direction) {
    if (ended) return;
    const result = move2048(board, direction);
    if (result.board.every((row, r) => row.every((value, c) => value === board[r][c]))) return;
    const next = addRandomTile(result.board);
    const nextScore = score + result.gained;
    setBoard(next);
    setScore(nextScore);
    if (next.some((row) => row.some((value) => value >= target))) { setWon(true); setEnded(true); }
    else if (!canMove2048(next)) setEnded(true);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const direction: Record<string, Direction> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
      const next = direction[event.key];
      if (!next || ended) return;
      event.preventDefault();
      move(next);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return <div>
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-xl font-bold">{target}</h2><p className="mt-1 text-sm text-muted-foreground">{t("矢印キーまたは画面のボタンで数字を合わせ、目標の数字を目指しましょう。")}</p></div>
      <button type="button" onClick={restart} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-input" aria-label={t("新しいゲーム")}><RotateCcw className="h-4 w-4" /></button>
    </div>
    <div className="mt-4 flex items-center justify-between"><p className="text-sm">{t("スコア")} <strong className="text-lg tabular-nums">{score}</strong></p>
      <div className="grid grid-cols-3 gap-1" aria-label={t("操作") }>
        <span /><button type="button" onClick={() => move("up")} aria-label={t("上") } className="grid h-10 w-10 place-items-center rounded-lg border border-input"><ArrowUp className="h-4 w-4" /></button><span />
        <button type="button" onClick={() => move("left")} aria-label={t("左") } className="grid h-10 w-10 place-items-center rounded-lg border border-input"><ArrowLeft className="h-4 w-4" /></button>
        <button type="button" onClick={() => move("down")} aria-label={t("下") } className="grid h-10 w-10 place-items-center rounded-lg border border-input"><ArrowDown className="h-4 w-4" /></button>
        <button type="button" onClick={() => move("right")} aria-label={t("右") } className="grid h-10 w-10 place-items-center rounded-lg border border-input"><ArrowRight className="h-4 w-4" /></button>
      </div>
    </div>
    <div className="mx-auto mt-4 grid aspect-square max-w-[390px] grid-cols-4 gap-2 rounded-xl bg-[#bbada0] p-2" role="grid" aria-label="2048">
      {board.flatMap((row, r) => row.map((value, c) => <div key={`${r}-${c}`} role="gridcell" aria-label={String(value)} className={`grid place-items-center rounded-lg font-bold tabular-nums ${value >= 10000 ? "text-base sm:text-lg" : "text-xl sm:text-2xl"}`}
        style={{ backgroundColor: tileColors[value] ?? "#3c3a32", color: value >= 8 ? "#fff" : "#776e65" }}>
        {value || ""}
      </div>))}
    </div>
    {ended ? <div className="mt-4 rounded-xl bg-muted p-3 text-center">
      <p className="font-semibold">{t(won ? "目標を達成しました！" : "ゲームオーバー")}</p>
      <p className="mt-1 text-sm">{t("スコア")} {score}</p>
      <div className="mt-3 flex justify-center gap-2">
        <button type="button" onClick={restart} className="min-h-11 rounded-full border border-input px-4 text-sm font-semibold">{t("もう一度遊ぶ")}</button>
        <button type="button" onClick={() => onShare(`${target} ${t("スコア")} ${score}`)} className="min-h-11 rounded-full bg-[hsl(var(--brand))] px-4 text-sm font-semibold text-white">{t("結果を投稿で共有")}</button>
      </div>
    </div> : null}
  </div>;
}
