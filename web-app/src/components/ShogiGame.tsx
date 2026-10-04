import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useSearchParams } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import { t } from "@/lib/language";
import { isDevelopmentSession } from "@/lib/development";
import type { Author } from "@/lib/posts";
import { createShogiRoom, fetchShogiRoom, joinShogiRoom, submitShogiMove, type ShogiRoom } from "@/lib/shogiRooms";
import {
  applyShogiAction,
  chooseShogiCpuAction,
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

export function ShogiGame({ onShare, author, initialRoomKey }: {
  onShare: (body: string) => void;
  author: Author | null;
  initialRoomKey: string | null;
}) {
  const [, setSearchParams] = useSearchParams();
  const [game, setGame] = useState(createShogiGame);
  const [gameMode, setGameMode] = useState<"cpu" | "online">(() => initialRoomKey ? "online" : "cpu");
  const [humanSide, setHumanSide] = useState<ShogiSide>("sente");
  const [isThinking, setIsThinking] = useState(false);
  const [isRoomBusy, setIsRoomBusy] = useState(false);
  const [room, setRoom] = useState<ShogiRoom | null>(null);
  const [roomKeyInput, setRoomKeyInput] = useState(initialRoomKey?.toUpperCase() ?? "");
  const [roomError, setRoomError] = useState("");
  const roomRef = useRef<ShogiRoom | null>(null);
  const attemptedRoom = useRef("");
  const [selectedSquare, setSelectedSquare] = useState<ShogiPosition | null>(null);
  const [selectedHand, setSelectedHand] = useState<ShogiKind | null>(null);
  const [promotionActions, setPromotionActions] = useState<ShogiAction[] | null>(null);
  const [winner, setWinner] = useState<ShogiSide | null>(null);
  const cpuIsTurn = gameMode === "cpu" && game.turn !== humanSide;
  const roomSeat: ShogiSide | null = room && author?.id === room.sente_user_id ? "sente"
    : room && author?.id === room.gote_user_id ? "gote" : null;
  const onlineIsTurn = gameMode === "online" && room?.status === "playing" && roomSeat === game.turn;
  const canInteract = !winner && !isThinking && !isRoomBusy && (gameMode === "cpu" ? !cpuIsTurn : onlineIsTurn);
  const selectedActions = useMemo(() => {
    if (!canInteract) return [];
    if (selectedSquare) return legalShogiMoves(game, selectedSquare.row, selectedSquare.col);
    if (selectedHand) return legalShogiDrops(game, selectedHand);
    return [];
  }, [canInteract, game, selectedHand, selectedSquare]);
  const turnIsCheck = isShogiInCheck(game, game.turn);
  const inviteUrl = room && typeof window !== "undefined"
    ? window.location.origin + "/games?game=shogi&room=" + room.room_key
    : "";

  function setCurrentRoom(value: ShogiRoom | null) {
    roomRef.current = value;
    setRoom(value);
  }

  useEffect(() => {
    if (gameMode !== "cpu" || game.turn === humanSide || winner) {
      setIsThinking(false);
      return;
    }
    setIsThinking(true);
    const timeout = window.setTimeout(() => {
      const action = chooseShogiCpuAction(game);
      if (!action) {
        setWinner(humanSide);
        setIsThinking(false);
        return;
      }
      const next = applyShogiAction(game, action);
      setGame(next);
      setWinner(isShogiCheckmate(next) ? game.turn : null);
      setSelectedSquare(null);
      setSelectedHand(null);
      setPromotionActions(null);
      setIsThinking(false);
    }, 320);
    return () => window.clearTimeout(timeout);
  }, [game, gameMode, humanSide, winner]);

  useEffect(() => {
    const roomKey = initialRoomKey?.trim().toUpperCase() ?? "";
    if (!roomKey || !author?.id || gameMode !== "online") return;
    const requestId = author.id + ":" + roomKey;
    if (attemptedRoom.current === requestId || roomRef.current?.room_key === roomKey) return;
    attemptedRoom.current = requestId;
    setIsRoomBusy(true);
    setRoomError("");
    void joinShogiRoom(roomKey, author).then((joined) => {
      setCurrentRoom(joined);
      setGame(joined.game_state);
      setRoomKeyInput(joined.room_key);
      setWinner(null);
    }).catch((error: unknown) => {
      setRoomError(error instanceof Error ? error.message : "部屋が見つからないか、参加できませんでした。");
    }).finally(() => setIsRoomBusy(false));
  }, [author?.id, gameMode, initialRoomKey]);

  useEffect(() => {
    if (gameMode !== "online" || !room?.room_key || !author?.id) return;
    let active = true;
    const refresh = async () => {
      try {
        const latest = await fetchShogiRoom(room.room_key, author.id);
        if (!active) return;
        if (!latest) {
          setRoomError("部屋が見つからないか、有効期限が切れています。");
          return;
        }
        const previous = roomRef.current;
        if (previous && (latest.revision > previous.revision || latest.status !== previous.status || latest.gote_user_id !== previous.gote_user_id)) {
          setCurrentRoom(latest);
          setGame(latest.game_state);
          setWinner(isShogiCheckmate(latest.game_state) ? (latest.game_state.turn === "sente" ? "gote" : "sente") : null);
          setSelectedSquare(null);
          setSelectedHand(null);
          setPromotionActions(null);
        }
      } catch { /* Keep the current board during a temporary connection error. */ }
    };
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 1500);
    return () => { active = false; window.clearInterval(interval); };
  }, [author?.id, gameMode, room?.room_key]);

  function restart() {
    setGame(createShogiGame());
    setSelectedSquare(null);
    setSelectedHand(null);
    setPromotionActions(null);
    setWinner(null);
    setIsThinking(false);
  }

  function changeMode(mode: "cpu" | "online") {
    setGameMode(mode);
    setWinner(null);
    setSelectedSquare(null);
    setSelectedHand(null);
    setPromotionActions(null);
    setIsThinking(false);
    if (mode === "cpu") {
      setGame(createShogiGame());
      setCurrentRoom(null);
      setRoomError("");
      setSearchParams((current) => { const next = new URLSearchParams(current); next.delete("room"); return next; });
    } else if (room) setGame(room.game_state);
  }

  async function createRoom() {
    if (!author || isDevelopmentSession()) { setRoomError("オンライン対局にはログインが必要です。"); return; }
    setIsRoomBusy(true); setRoomError("");
    try {
      const created = await createShogiRoom(author);
      setCurrentRoom(created);
      setGame(created.game_state);
      setRoomKeyInput(created.room_key);
      setWinner(null);
      setSearchParams((current) => { const next = new URLSearchParams(current); next.set("game", "shogi"); next.set("room", created.room_key); return next; });
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : "対局部屋を作成できませんでした。もう一度お試しください。");
    } finally { setIsRoomBusy(false); }
  }

  async function enterRoom() {
    if (!author || isDevelopmentSession()) { setRoomError("オンライン対局にはログインが必要です。"); return; }
    const key = roomKeyInput.trim().toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(key)) { setRoomError("部屋キーを確認してください。"); return; }
    setIsRoomBusy(true); setRoomError("");
    try {
      const joined = await joinShogiRoom(key, author);
      setCurrentRoom(joined);
      setGame(joined.game_state);
      setRoomKeyInput(joined.room_key);
      setWinner(null);
      setSearchParams((current) => { const next = new URLSearchParams(current); next.set("game", "shogi"); next.set("room", joined.room_key); return next; });
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : "部屋が見つからないか、参加できませんでした。");
    } finally { setIsRoomBusy(false); }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setRoomError("招待リンクをコピーしました。");
    } catch { setRoomError("招待リンクをコピーできませんでした。"); }
  }

  function winnerLabel(): string {
    if (gameMode === "online") return winner === roomSeat ? "あなたの勝ち" : "相手の勝ち";
    if (winner === humanSide) return winner === "sente" ? "先手の勝ち" : "後手の勝ち";
    return "CPUの勝ち";
  }

  function turnLabel(): string {
    if (isThinking) return "CPUが考えています…";
    if (isRoomBusy) return "通信中…";
    if (gameMode === "online") {
      if (room?.status === "waiting") return "相手の参加を待っています。";
      return roomSeat === game.turn ? "あなたの番" : "相手の番";
    }
    return game.turn === humanSide ? "あなたの番" : "CPUの番";
  }

  async function commit(action: ShogiAction) {
    const next = applyShogiAction(game, action);
    setSelectedSquare(null);
    setSelectedHand(null);
    setPromotionActions(null);
    if (gameMode === "online" && room && author && roomSeat) {
      setIsRoomBusy(true); setRoomError("");
      try {
        const updated = await submitShogiMove(room, author.id, action, next);
        setCurrentRoom(updated);
        setGame(updated.game_state);
        setWinner(isShogiCheckmate(updated.game_state) ? game.turn : null);
      } catch (error) {
        setRoomError(error instanceof Error ? error.message : "手を保存できませんでした。盤面を更新して再度お試しください。");
        try {
          const latest = await fetchShogiRoom(room.room_key, author.id);
          if (latest) { setCurrentRoom(latest); setGame(latest.game_state); }
        } catch { /* The next room refresh can recover the board. */ }
      } finally { setIsRoomBusy(false); }
      return;
    }
    const nextWinner = isShogiCheckmate(next) ? game.turn : null;
    setGame(next);
    setWinner(nextWinner);
  }

  function selectDestination(row: number, col: number) {
    const choices = selectedActions.filter((action) => action.to.row === row && action.to.col === col);
    if (choices.length > 1) setPromotionActions(choices);
    else if (choices.length === 1) commit(choices[0]);
  }

  function selectSquare(row: number, col: number) {
    if (promotionActions || !canInteract) return;
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
    if (!canInteract || promotionActions || !game.hands[game.turn].includes(kind)) return;
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
          return <button key={kind} type="button" disabled={!canInteract || !isCurrent || Boolean(promotionActions)}
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
    <p className="text-sm text-muted-foreground">{t("CPUまたはQRコード・部屋キーで招待した相手とオンライン対局できます。合法手・成り・持ち駒・王手と詰みを判定します。")}</p>
    <div className="space-y-2">
      <div className="flex gap-2" role="group" aria-label={t("対局モード")}>
        {(["cpu", "online"] as const).map((mode) => <button key={mode} type="button" aria-pressed={gameMode === mode}
          onClick={() => changeMode(mode)}
          className={`min-h-10 flex-1 rounded-full border px-3 text-sm font-semibold ${gameMode === mode ? "border-[hsl(var(--brand))] bg-[hsl(var(--brand))]/10 text-[hsl(var(--brand))]" : "border-input"}`}>
          {t(mode === "cpu" ? "CPU対戦" : "部屋対局")}
        </button>)}
      </div>
      {gameMode === "cpu" ? <div className="flex items-center gap-2" role="group" aria-label={t("あなたの手番")}>
        <span className="text-xs text-muted-foreground">{t("あなたの手番")}</span>
        {(["sente", "gote"] as const).map((side) => <button key={side} type="button" aria-pressed={humanSide === side}
          onClick={() => { setHumanSide(side); restart(); }}
          className={`min-h-9 flex-1 rounded-lg border px-2 text-sm ${humanSide === side ? "border-[hsl(var(--brand))] bg-[hsl(var(--brand))]/10 font-semibold" : "border-input"}`}>
          {t(side === "sente" ? "先手" : "後手")}
        </button>)}
      </div> : null}
    </div>
    {gameMode === "online" ? <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
      {!room ? <div className="space-y-3">
        {!author || isDevelopmentSession() ? <p className="text-sm text-muted-foreground">{t("オンライン対局にはログインが必要です。")}</p> : <div className="flex flex-wrap gap-2">
          <button type="button" disabled={isRoomBusy} onClick={() => void createRoom()}
            className="min-h-10 flex-1 rounded-lg bg-[hsl(var(--brand))] px-3 text-sm font-semibold text-white disabled:opacity-50">
            {t(isRoomBusy ? "作成中…" : "部屋を作成")}
          </button>
          <input value={roomKeyInput} maxLength={6} autoCapitalize="characters"
            onChange={(event) => setRoomKeyInput(event.target.value.toUpperCase())}
            aria-label={t("部屋キー")} placeholder={t("部屋キーを入力")}
            className="min-h-10 w-32 rounded-lg border border-input bg-background px-3 text-center font-mono uppercase tracking-widest" />
          <button type="button" disabled={isRoomBusy || roomKeyInput.trim().length !== 6} onClick={() => void enterRoom()}
            className="min-h-10 rounded-lg border border-input px-3 text-sm font-semibold disabled:opacity-50">{t("部屋に参加")}</button>
        </div>}
      </div> : <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-32 flex-1">
          <p className="text-xs text-muted-foreground">{t("部屋キー")}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="font-mono text-2xl font-bold tracking-[0.2em]">{room.room_key}</p>
            <button type="button" aria-label={t("部屋キーをコピー")}
              onClick={() => { void navigator.clipboard.writeText(room.room_key)
                .then(() => setRoomError("部屋キーをコピーしました。"))
                .catch(() => setRoomError("招待リンクをコピーできませんでした。")); }}
              className="rounded-md border border-input px-2 py-1 text-xs">{t("部屋キーをコピー")}</button>
          </div>
          <p aria-live="polite" className="mt-1 text-sm text-muted-foreground">
            {t(room.status === "waiting" ? "相手の参加を待っています。" : "対局中です。相手の手を待っています。")}
          </p>
          <button type="button" onClick={() => void copyInvite()} className="mt-2 min-h-9 rounded-full border border-input px-3 text-sm">{t("招待リンクをコピー")}</button>
        </div>
        {inviteUrl ? <div className="rounded-lg bg-white p-2" aria-label={t("招待URLのQRコード")}><QRCodeSVG value={inviteUrl} size={128} includeMargin /></div> : null}
      </div>}
      {roomError ? <p role="status" className="text-sm text-destructive">{t(roomError)}</p> : null}
    </div> : null}
    {renderHand("gote")}
    <div className="flex items-center justify-between gap-2">
      <p aria-live="polite" className="text-sm font-semibold">
        {winner ? t(winnerLabel()) : <>{t(turnLabel())}{turnIsCheck && !isRoomBusy ? ` · ${t("王手")}` : ""}</>}
      </p>
      {gameMode === "cpu" ? <button type="button" onClick={restart} aria-label={t("新しいゲーム")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-input">
        <RotateCcw className="h-4 w-4" aria-hidden />
      </button> : null}
    </div>
    <div role="group" aria-label={t("将棋盤")} className="mx-auto grid w-full max-w-[440px] grid-cols-9 overflow-hidden border-2 border-[#8b683d] bg-[#e9cf98]">
      {game.board.flatMap((row, rowIndex) => row.map((piece, colIndex) => {
        const isSelected = selectedSquare?.row === rowIndex && selectedSquare.col === colIndex;
        const isDestination = selectedActions.some((action) => action.to.row === rowIndex && action.to.col === colIndex);
        const glyph = piece ? shogiPieceGlyph(piece) : "";
        return <button key={`${rowIndex}-${colIndex}`} type="button"
          aria-label={`${rowIndex + 1} ${colIndex + 1} ${glyph || t("空きマス")}`}
          aria-selected={isSelected}
          onClick={() => selectSquare(rowIndex, colIndex)} disabled={!canInteract}
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
      <p className="font-semibold">{t(winnerLabel())}</p>
      <button type="button" onClick={() => onShare(t(winnerLabel()) + " · " + t("将棋"))}
        className="mt-3 min-h-10 rounded-full bg-[hsl(var(--brand))] px-4 font-semibold text-white">{t("結果を投稿で共有")}</button>
    </div> : null}
  </div>;
}
