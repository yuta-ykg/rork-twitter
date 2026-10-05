import { useState } from "react";
import { createGoGame, passTurn, placeStone, scoreGo, type Stone } from "@/lib/go";
import { t, useLanguage } from "@/lib/language";

function stoneName(stone: Stone) {
  return t(stone === "black" ? "黒" : "白");
}

export function GoGame() {
  useLanguage();
  const [game, setGame] = useState(createGoGame);
  const points = game.finished ? scoreGo(game.board) : {
    black: game.board.filter((stone) => stone === "black").length,
    white: game.board.filter((stone) => stone === "white").length,
  };
  const winner = points.black > points.white ? "black" : "white";

  return <div className="mx-auto max-w-[560px]">
    <h2 className="text-xl font-bold">{t("囲碁")}</h2>
    <p className="mt-2 text-sm text-muted-foreground">{t("9路盤で交互に打ちます。2回続けてパスすると終局です。")}</p>
    <p className="mt-1 text-xs text-muted-foreground">{t("中国式の面積計算・白にコミ5.5目。死石は終局前に取り除いてください。")}</p>
    <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-muted px-4 py-3" aria-live="polite">
      <span className="flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-slate-900" />{t("黒")} <strong>{points.black}</strong></span>
      <strong className="text-center text-sm">{game.finished ? `${stoneName(winner)}${t("の勝ち")}` : `${stoneName(game.turn)}${t("の番")}`}</strong>
      <span className="flex items-center gap-2"><span className="h-5 w-5 rounded-full border border-slate-400 bg-white" />{t("白")} <strong>{points.white}</strong></span>
    </div>
    <div className="mt-5 grid aspect-square grid-cols-9 rounded-lg border-[6px] border-amber-800 bg-amber-200 shadow-lg" role="group" aria-label={t("囲碁盤")}>
      {game.board.map((stone, index) => {
        const legal = !game.finished && stone === null && placeStone(game, index) !== game;
        const row = Math.floor(index / 9);
        const col = index % 9;
        return <button key={index} type="button" disabled={!legal} onClick={() => setGame((current) => placeStone(current, index))}
          aria-label={`${row + 1}${t("行")}${col + 1}${t("列")}、${stone ? stoneName(stone) : legal ? t("置けます") : t("空き")}`}
          className="relative aspect-square touch-manipulation focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 disabled:cursor-default">
          <span className="pointer-events-none absolute left-0 right-0 top-1/2 h-px bg-amber-900/70" />
          <span className="pointer-events-none absolute bottom-0 left-1/2 top-0 w-px bg-amber-900/70" />
          {[2, 4, 6].includes(row) && [2, 4, 6].includes(col) && <span className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-900" />}
          {stone && <span className={`pointer-events-none absolute inset-[9%] rounded-full shadow-md ${stone === "black" ? "bg-slate-900" : "border border-slate-300 bg-white"}`} />}
          {game.lastMove === index && <span className={`pointer-events-none absolute left-1/2 top-1/2 z-10 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${stone === "black" ? "bg-white" : "bg-slate-900"}`} />}
        </button>;
      })}
    </div>
    <div className="mt-5 flex gap-2">
      <button type="button" disabled={game.finished} onClick={() => setGame(passTurn)} className="min-h-11 flex-1 rounded-full border border-border font-semibold disabled:opacity-40">{t("パス")}</button>
      <button type="button" onClick={() => setGame(createGoGame())} className="min-h-11 flex-1 rounded-full border border-border font-semibold">{t("新しい対局")}</button>
    </div>
    {game.passes === 1 && !game.finished && <p className="mt-3 text-center text-sm text-muted-foreground">{t("相手がパスしました。続けてパスすると終局です。")}</p>}
    {game.finished && <p className="mt-3 text-center text-sm text-muted-foreground">{t("黒")} {points.black} · {t("白")} {points.white}</p>}
  </div>;
}
