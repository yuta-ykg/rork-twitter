import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, RotateCw } from "lucide-react";
import { createPuyoGame, hardDropPuyo, movePuyo, pairCells, rotatePuyo, stepPuyo, type PuyoColor } from "@/lib/puyoPuzzle";
import { t, useLanguage } from "@/lib/language";

const colorClasses: Record<PuyoColor, string> = {
  red: "bg-rose-500",
  blue: "bg-sky-500",
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
};
const colorNames: Record<PuyoColor, string> = {
  red: "赤",
  blue: "青",
  green: "緑",
  yellow: "黄",
};

export function PuyoPuzzleGame() {
  useLanguage();
  const [game, setGame] = useState(createPuyoGame);
  useEffect(() => {
    if (game.ended) return;
    const timer = window.setInterval(() => setGame((current) => stepPuyo(current)), 650);
    return () => window.clearInterval(timer);
  }, [game.ended]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && ["BUTTON", "INPUT", "TEXTAREA"].includes(event.target.tagName)) return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) event.preventDefault();
      if (event.key === "ArrowLeft") setGame((current) => movePuyo(current, -1));
      if (event.key === "ArrowRight") setGame((current) => movePuyo(current, 1));
      if (event.key === "ArrowUp") setGame(rotatePuyo);
      if (event.key === "ArrowDown") setGame((current) => stepPuyo(current));
      if (event.key === " ") setGame((current) => hardDropPuyo(current));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const active = useMemo(() => {
    const cells = new Map<number, PuyoColor>();
    if (!game.ended) for (const [row, col, color] of pairCells(game.active)) cells.set(row * 6 + col, color);
    return cells;
  }, [game.active, game.ended]);

  return <div className="mx-auto max-w-[560px]">
    <h2 className="text-xl font-bold">{t("カラーペアパズル")}</h2>
    <p className="mt-2 text-sm text-muted-foreground">{t("同じ色を4つ以上つなげると消えます。連鎖を狙いましょう。")}</p>
    <div className="mt-4 flex items-start justify-center gap-3">
      <div className="grid w-full max-w-[264px] shrink-0 grid-cols-6 gap-1 rounded-xl bg-slate-800 p-2 shadow-lg"
        role="group" aria-label={t("落ちものパズルの盤面")}>
        {game.board.map((settled, index) => {
          const color = active.get(index) ?? settled;
          return <div key={index}
            aria-label={`${Math.floor(index / 6) + 1}${t("行")}${index % 6 + 1}${t("列")}、${color ? t(colorNames[color]) : t("空き")}`}
            className="grid aspect-square place-items-center rounded-md bg-slate-600">
            {color && <span className={`h-[85%] w-[85%] rounded-full shadow-inner ring-1 ring-white/30 ${colorClasses[color]}`} />}
          </div>;
        })}
      </div>
      <div className="min-w-[82px] rounded-xl bg-muted p-2 text-center text-sm">
        <p className="font-semibold">{t("次のペア")}</p>
        <div className="mt-2 flex flex-col items-center gap-1">
          {[game.next[1], game.next[0]].map((color, index) =>
            <span key={index} className={`h-7 w-7 rounded-full ring-1 ring-white/30 ${colorClasses[color]}`} />)}
        </div>
      </div>
    </div>
    <div className="mt-4 flex justify-between rounded-xl bg-muted px-4 py-3 text-sm">
      <span>{t("スコア")} <strong className="tabular-nums">{game.score}</strong></span>
      <span>{t("連鎖")} <strong className="tabular-nums">{game.lastChain}</strong></span>
    </div>
    {game.ended && <p className="mt-4 text-center font-semibold" role="status">{t("ゲームオーバー")}</p>}
    <div className="mt-4 grid grid-cols-5 gap-2" role="group" aria-label={t("操作")}>
      <button type="button" disabled={game.ended} onClick={() => setGame((current) => movePuyo(current, -1))} aria-label={t("左")} className="grid min-h-12 place-items-center rounded-xl border border-border"><ArrowLeft className="h-5 w-5" /></button>
      <button type="button" disabled={game.ended} onClick={() => setGame(rotatePuyo)} aria-label={t("回転")} className="grid min-h-12 place-items-center rounded-xl border border-border"><RotateCw className="h-5 w-5" /></button>
      <button type="button" disabled={game.ended} onClick={() => setGame((current) => movePuyo(current, 1))} aria-label={t("右")} className="grid min-h-12 place-items-center rounded-xl border border-border"><ArrowRight className="h-5 w-5" /></button>
      <button type="button" disabled={game.ended} onClick={() => setGame((current) => stepPuyo(current))} aria-label={t("下")} className="grid min-h-12 place-items-center rounded-xl border border-border"><ArrowDown className="h-5 w-5" /></button>
      <button type="button" disabled={game.ended} onClick={() => setGame((current) => hardDropPuyo(current))} aria-label={t("一気に落とす")} className="min-h-12 rounded-xl border border-border px-1 text-xs font-semibold">{t("落下")}</button>
    </div>
    <p className="mt-2 text-xs text-muted-foreground">{t("キーボードの矢印キーとスペースキーでも操作できます。")}</p>
    <button type="button" onClick={() => setGame(createPuyoGame())} className="mt-4 min-h-11 w-full rounded-full border border-border font-semibold">{t("新しいゲーム")}</button>
  </div>;
}
