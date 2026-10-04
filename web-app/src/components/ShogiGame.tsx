import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { t } from "@/lib/language";
import {
  applyShogiAction,
  createShogiGame,
  isShogiCheckmate,
  isShogiInCheck,
  legalShogiDrops,
  legalShogiMoves,
  shogiHandOrder,
  shogiPieceGlyph,
  type ShogiAction,
  type ShogiKind,
  type ShogiPosition,
  type ShogiSide,
} from "@/lib/shogi";

export function ShogiGame({ onShare }: { onShare: (body: string) => void }) {
  const [game, setGame] = useState(createShogiGame);
  const [selectedSquare, setSelectedSquare] = useState<ShogiPosition | null>(null);
  const [selectedHand, setSelectedHand] = useState<ShogiKind | null>(null);
  const [promotionActions, setPromotionActions] = useState<ShogiAction[] | null>(null);
  const [winner, setWinner] = useState<ShogiSide | null>(null);
  const selectedActions = useMemo(() => {
    if (winner) return [];
    if (selectedSquare) return legalShogiMoves(game, selectedSquare.row, selectedSquare.col);
    if (selectedHand) return legalShogiDrops(game, selectedHand);
    return [];
  }, [game, selectedHand, selectedSquare, winner]);
  const turnIsCheck = isShogiInCheck(game, game.turn);

  function restart() {
    setGame(createShogiGame());
    setSelectedSquare(null);
    setSelectedHand(null);
    setPromotionActions(null);
    setWinner(null);
  }

  function commit(action: ShogiAction) {
    const next = applyShogiAction(game, action);
    const nextWinner = isShogiCheckmate(next) ? game.turn : null;
    setGame(next);
    setSelectedSquare(null);
    setSelectedHand(null);
    setPromotionActions(null);
    setWinner(nextWinner);
  }

  function selectDestination(row: number, col: number) {
    const choices = selectedActions.filter((action) => action.to.row === row && action.to.col === col);
    if (choices.length > 1) setPromotionActions(choices);
    else if (choices.length === 1) commit(choices[0]);
  }

  function selectSquare(row: number, col: number) {
    if (promotionActions || winner) return;
    const isSelectedDestination = selectedActions.some((action) => action.to.row === row && action.to.col === col);
    if (isSelectedDestination) {
      selectDestination(row, col);
      return;
    }
    const piece = game.board[row][col];
    if (piece?.side === game.turn) {
      setSelectedSquare({ row, col });
      setSelectedHand(null);
    } else {
      setSelectedSquare(null);
      setSelectedHand(null);
    }
  }

  function selectHand(kind: ShogiKind) {
    if (winner || promotionActions || !game.hands[game.turn].includes(kind)) return;
    setSelectedHand((current) => current === kind ? null : kind);
    setSelectedSquare(null);
  }

  function renderHand(side: ShogiSide) {
    const hand = game.hands[side];
    const kinds = shogiHandOrder(hand);
    return <div className="rounded-xl border border-border bg-card px-3 py-2">
      <p className="mb-1 text-xs font-semibold text-muted-foreground">{t(side === "sente" ? "先手" : "後手")} · {t("持ち駒")}</p>
      <div className="flex min-h-10 flex-wrap items-center gap-1">
        {kinds.length ? kinds.map((kind) => {
          const count = hand.filter((held) => held === kind).length;
          const piece = { side, kind, promoted: false } as const;
          const isCurrent = side === game.turn;
          return <button key={kind} type="button" disabled={!isCurrent || Boolean(winner) || Boolean(promotionActions)}
            aria-pressed={isCurrent && selectedHand === kind}
            aria-label={`${t(side === "sente" ? "先手" : "後手")} ${t("持ち駒")} ${shogiPieceGlyph(piece)} ${count}`}
            onClick={() => selectHand(kind)}
            className={`grid min-h-9 min-w-10 place-items-center rounded-md px-1 text-sm font-bold disabled:opacity-60 ${isCurrent && selectedHand === kind ? "bg-[hsl(var(--brand))]/20 text-[hsl(var(--brand))]" : "bg-muted text-foreground"}`}>
            {shogiPieceGlyph(piece)}{count > 1 ? <span className="ml-0.5 text-[10px]">{count}</span> : null}
          </button>;
        }) : <span className="px-1 text-sm text-muted-foreground">—</span>}
      </div>
    </div>;
  }

  return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">{t("同じ端末で交互に指す将棋です。駒の移動・成り・持ち駒・王手と詰みを判定します。")}</p>
    {renderHand("gote")}
    <div className="flex items-center justify-between gap-2">
      <p aria-live="polite" className="text-sm font-semibold">
        {winner ? t(winner === "sente" ? "先手の勝ち" : "後手の勝ち") : <>{t(game.turn === "sente" ? "先手の番" : "後手の番")}{turnIsCheck ? ` · ${t("王手")}` : ""}</>}
      </p>
      <button type="button" onClick={restart} aria-label={t("新しいゲーム")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-input">
        <RotateCcw className="h-4 w-4" aria-hidden />
      </button>
    </div>
    <div role="group" aria-label={t("将棋盤")} className="mx-auto grid w-full max-w-[440px] grid-cols-9 overflow-hidden border-2 border-[#8b683d] bg-[#e9cf98]">
      {game.board.flatMap((row, rowIndex) => row.map((piece, colIndex) => {
        const isSelected = selectedSquare?.row === rowIndex && selectedSquare.col === colIndex;
        const isDestination = selectedActions.some((action) => action.to.row === rowIndex && action.to.col === colIndex);
        const glyph = piece ? shogiPieceGlyph(piece) : "";
        return <button key={`${rowIndex}-${colIndex}`} type="button"
          aria-label={`${rowIndex + 1} ${colIndex + 1} ${glyph || t("空きマス")}`}
          aria-selected={isSelected}
          onClick={() => selectSquare(rowIndex, colIndex)}
          className={`relative grid aspect-square place-items-center border border-[#b4915c] text-[#332315] ${isSelected ? "z-10 bg-amber-300/80 ring-2 ring-inset ring-amber-700" : "hover:bg-amber-100/60"}`}>
          {piece ? <span className={`text-[clamp(12px,4.5vw,22px)] font-bold leading-none ${piece.side === "gote" ? "rotate-180" : ""}`}>{glyph}</span> : null}
          {isDestination ? piece ? <span className="absolute inset-1 rounded-full ring-2 ring-emerald-700/70" aria-hidden /> : <span className="h-2.5 w-2.5 rounded-full bg-emerald-800/60" aria-hidden /> : null}
        </button>;
      }))}
    </div>
    {renderHand("sente")}
    {promotionActions ? <div role="dialog" aria-label={t("成りを選択")} className="rounded-xl border border-[hsl(var(--brand))]/40 bg-[hsl(var(--brand))]/5 p-3">
      <p className="text-sm font-semibold">{t("成りますか？")}</p>
      <div className="mt-2 flex gap-2">
        {promotionActions.map((action) => <button key={String(action.promote)} type="button" onClick={() => commit(action)}
          className="min-h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm font-semibold">{t(action.promote ? "成る" : "成らない")}</button>)}
      </div>
    </div> : null}
    {winner ? <div className="rounded-xl bg-emerald-50 p-3 text-center text-sm text-emerald-900">
      <p className="font-semibold">{t(winner === "sente" ? "先手の勝ち" : "後手の勝ち")}</p>
      <button type="button" onClick={() => onShare(`${t(winner === "sente" ? "先手の勝ち" : "後手の勝ち")} · ${t("将棋")}`)}
        className="mt-3 min-h-10 rounded-full bg-[hsl(var(--brand))] px-4 font-semibold text-white">{t("結果を投稿で共有")}</button>
    </div> : null}
  </div>;
}
