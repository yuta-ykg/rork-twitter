import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { blockPieces, canPlaceBlock, createBlockGame, placeBlock, type Piece } from "@/lib/blockPuzzle";
import { t, useLanguage } from "@/lib/language";

function PiecePreview({ piece, cellSize = 16 }: { piece: Piece; cellSize?: number }) {
  const width = Math.max(...piece.cells.map(([, col]) => col)) + 1;
  const height = Math.max(...piece.cells.map(([row]) => row)) + 1;
  const cells = new Set(piece.cells.map(([row, col]) => row * width + col));
  return <span className="grid gap-1" style={{ gridTemplateColumns: `repeat(${width}, ${cellSize}px)` }}>
    {Array.from({ length: width * height }, (_, index) => <span key={index}
      className={`rounded-[3px] ${cells.has(index) ? "bg-sky-500" : "bg-transparent"}`}
      style={{ width: cellSize, height: cellSize }} />)}
  </span>;
}

export function BlockBlastGame() {
  useLanguage();
  const [game, setGame] = useState(createBlockGame);
  const [selected, setSelected] = useState<number | null>(0);
  const [hover, setHover] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number; trayIndex: number } | null>(null);
  const drag = useRef<{ trayIndex: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const selectedPieceIndex = selected === null ? null : game.tray[selected];
  const piece = selectedPieceIndex === null || selectedPieceIndex === undefined ? null : blockPieces[selectedPieceIndex];
  const previewValid = hover !== null && piece !== null && canPlaceBlock(game.board, piece, Math.floor(hover / 8), hover % 8);
  const preview = new Set(previewValid && piece ? piece.cells.map(([dr, dc]) => hover! + dr * 8 + dc) : []);

  function place(index: number, trayIndex = selected) {
    if (trayIndex === null || game.ended) return;
    const next = placeBlock(game, trayIndex, Math.floor(index / 8), index % 8);
    if (next === game) {
      setNotice(t("ここには置けません。"));
      return;
    }
    setGame(next);
    setSelected(next.ended ? null : next.tray.findIndex((item) => item !== null));
    setNotice("");
    setHover(null);
  }

  function cellAt(x: number, y: number): number | null {
    const cell = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-block-cell]");
    return cell ? Number(cell.dataset.blockCell) : null;
  }

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>, trayIndex: number) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { trayIndex, x: event.clientX, y: event.clientY, moved: false };
    setSelected(trayIndex);
  }

  function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active) return;
    if (!active.moved && Math.hypot(event.clientX - active.x, event.clientY - active.y) < 8) return;
    active.moved = true;
    event.preventDefault();
    setDragPosition({ x: event.clientX, y: event.clientY, trayIndex: active.trayIndex });
    setHover(cellAt(event.clientX, event.clientY));
  }

  function endDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    drag.current = null;
    setDragPosition(null);
    setHover(null);
    if (!active?.moved) return;
    event.preventDefault();
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
    const cell = cellAt(event.clientX, event.clientY);
    if (cell !== null) place(cell, active.trayIndex);
  }

  function restart() {
    setGame(createBlockGame());
    setSelected(0);
    setNotice("");
    setHover(null);
    setDragPosition(null);
    drag.current = null;
  }

  return <div className="mx-auto max-w-[560px]">
    <h2 className="text-xl font-bold">{t("ブロックパズル")}</h2>
    <p className="mt-2 text-sm text-muted-foreground">{t("ピースを選んで盤面をタップ、またはドラッグして置きます。行か列を埋めると消えます。")}</p>
    <div className="mt-4 flex justify-between rounded-2xl bg-muted px-4 py-3 text-sm">
      <span>{t("スコア")} <strong className="text-lg tabular-nums">{game.score}</strong></span>
      <span>{t("消したライン")} <strong className="text-lg tabular-nums">{game.lines}</strong></span>
    </div>
    <div className="mt-5 grid aspect-square grid-cols-8 gap-[3px] rounded-xl bg-slate-800 p-[5px] shadow-lg" role="group" aria-label={t("ブロックパズルの盤面")}>
      {game.board.map((filled, index) => <button key={index} type="button" disabled={game.ended} data-block-cell={index}
        onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)}
        onFocus={() => setHover(index)} onBlur={() => setHover(null)}
        onClick={() => place(index)}
        aria-label={`${Math.floor(index / 8) + 1}${t("行")}${index % 8 + 1}${t("列")}、${filled ? t("ブロックあり") : t("空き")}`}
        className={`aspect-square rounded-[4px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${filled ? "bg-sky-500 shadow-inner" : preview.has(index) ? "bg-sky-300" : "bg-slate-600 hover:bg-slate-500"}`} />)}
    </div>
    <p className="mt-4 text-sm font-semibold">{t("ピースを選択")}</p>
    <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label={t("次のピース")}>
      {game.tray.map((pieceIndex, trayIndex) => {
        const shape = pieceIndex === null ? null : blockPieces[pieceIndex];
        return <button key={trayIndex} type="button" disabled={shape === null || game.ended}
          aria-pressed={selected === trayIndex} aria-label={shape ? `${t("ピース")} ${trayIndex + 1}、${shape.name}` : t("使用済み")}
          onPointerDown={(event) => startDrag(event, trayIndex)}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={() => { drag.current = null; setDragPosition(null); setHover(null); }}
          onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } setSelected(trayIndex); }}
          className={`flex min-h-20 touch-none items-center justify-center rounded-xl border p-2 ${selected === trayIndex ? "border-sky-400 bg-sky-500/10" : "border-border bg-muted/30"} disabled:opacity-40`}>
          {shape && <PiecePreview piece={shape} />}
        </button>;
      })}
    </div>
    {dragPosition && game.tray[dragPosition.trayIndex] !== null && (
      <div className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-slate-900/85 p-2 shadow-xl"
        style={{ left: dragPosition.x, top: dragPosition.y }}>
        <PiecePreview piece={blockPieces[game.tray[dragPosition.trayIndex]!]} cellSize={20} />
      </div>
    )}
    {notice && <p className="mt-3 text-sm text-red-500" role="status">{notice}</p>}
    {game.ended && <p className="mt-4 text-center font-semibold" role="status">{t("置ける場所がありません。ゲーム終了です。")}</p>}
    <button type="button" onClick={restart} className="mt-5 min-h-11 w-full rounded-full border border-border font-semibold hover:bg-muted">
      {t("新しいゲーム")}
    </button>
  </div>;
}
