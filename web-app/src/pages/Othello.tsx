import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shell } from "./Index";
import { t, useLanguage } from "@/lib/language";
import { createGame, legalMoves, playMove, score, type Disc } from "@/lib/othello";

function playerName(player: Disc) {
  return t(player === "black" ? "黒" : "白");
}

export default function OthelloPage() {
  useLanguage();
  const navigate = useNavigate();
  const [game, setGame] = useState(createGame);
  const moves = useMemo(() => new Set(game.finished ? [] : legalMoves(game.board, game.turn)), [game]);
  const scores = score(game.board);
  const winner = scores.black === scores.white ? null : scores.black > scores.white ? "black" : "white";
  const status = game.finished
    ? winner ? `${playerName(winner)}${t("の勝ち")}` : t("引き分け")
    : `${playerName(game.turn)}${t("の番")}`;

  return (
    <Shell tab="games" onCompose={() => navigate("/", { state: { compose: true } })}>
      <div className="mx-auto max-w-[560px] py-6">
        <p className="text-sm font-semibold text-[hsl(var(--brand))]">{t("ゲーム")}</p>
        <h1 className="mt-1 text-3xl font-bold">{t("オセロ")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("同じ端末で交互に遊べます。置ける場所を選んでください。")}</p>
        <div className="mt-5 flex items-center justify-between gap-2 rounded-2xl bg-muted px-4 py-3" aria-live="polite">
          <div className="flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-slate-900" />{t("黒")} <strong>{scores.black}</strong></div>
          <strong className="text-center text-sm">{status}</strong>
          <div className="flex items-center gap-2"><span className="h-5 w-5 rounded-full border border-slate-400 bg-white" />{t("白")} <strong>{scores.white}</strong></div>
        </div>
        {game.passed && <p className="mt-3 text-center text-sm text-muted-foreground" aria-live="polite">{playerName(game.passed)}{t("は置けないためパスしました。")}</p>}
        <div className="mt-5 grid aspect-square grid-cols-8 gap-[2px] rounded-xl bg-emerald-950 p-[3px] shadow-lg" role="group" aria-label={t("オセロの盤面")}>
          {game.board.map((disc, index) => {
            const legal = moves.has(index);
            const label = `${Math.floor(index / 8) + 1}${t("行")}${index % 8 + 1}${t("列")}、${disc ? playerName(disc) : legal ? t("置けます") : t("空き")}`;
            return (
              <button key={index} type="button" disabled={!legal} onClick={() => setGame((current) => playMove(current, index))}
                aria-label={label}
                className="flex aspect-square items-center justify-center bg-emerald-600 transition-colors enabled:hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:cursor-default">
                {disc ? <span className={`h-[80%] w-[80%] rounded-full shadow-md ${disc === "black" ? "bg-slate-900" : "border border-slate-300 bg-white"}`} /> :
                  legal ? <span className="h-[22%] w-[22%] rounded-full bg-white/55" /> : null}
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => setGame(createGame())} className="mt-5 min-h-11 w-full rounded-full border border-border font-semibold hover:bg-muted">
          {t("新しい対局")}
        </button>
      </div>
    </Shell>
  );
}
