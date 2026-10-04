export type ShogiSide = "sente" | "gote";
export type ShogiKind = "P" | "L" | "N" | "S" | "G" | "B" | "R" | "K";
export type ShogiBoard = (ShogiPiece | null)[][];
export type ShogiHands = Record<ShogiSide, ShogiKind[]>;
export type ShogiPosition = { row: number; col: number };
export type ShogiAction = { from?: ShogiPosition; to: ShogiPosition; drop?: ShogiKind; promote?: boolean };
export type ShogiPiece = { side: ShogiSide; kind: ShogiKind; promoted: boolean };
export type ShogiState = { board: ShogiBoard; hands: ShogiHands; turn: ShogiSide };

const promotionKinds = new Set<ShogiKind>(["P", "L", "N", "S", "B", "R"]);
const handOrder: ShogiKind[] = ["R", "B", "G", "S", "N", "L", "P"];
const inBounds = (row: number, col: number) => row >= 0 && row < 9 && col >= 0 && col < 9;
const otherSide = (side: ShogiSide): ShogiSide => side === "sente" ? "gote" : "sente";
const forward = (side: ShogiSide) => side === "sente" ? -1 : 1;

export function createShogiGame(): ShogiState {
  const board: ShogiBoard = Array.from({ length: 9 }, () => Array<ShogiPiece | null>(9).fill(null));
  const backRank: ShogiKind[] = ["L", "N", "S", "G", "K", "G", "S", "N", "L"];
  backRank.forEach((kind, col) => {
    board[0][col] = { side: "gote", kind, promoted: false };
    board[8][col] = { side: "sente", kind, promoted: false };
    board[2][col] = { side: "gote", kind: "P", promoted: false };
    board[6][col] = { side: "sente", kind: "P", promoted: false };
  });
  board[1][1] = { side: "gote", kind: "B", promoted: false };
  board[1][7] = { side: "gote", kind: "R", promoted: false };
  board[7][1] = { side: "sente", kind: "R", promoted: false };
  board[7][7] = { side: "sente", kind: "B", promoted: false };
  return { board, hands: { sente: [], gote: [] }, turn: "sente" };
}

export function shogiPieceGlyph(piece: ShogiPiece): string {
  if (piece.promoted) {
    const promoted: Partial<Record<ShogiKind, string>> = { P: "と", L: "杏", N: "圭", S: "全", B: "馬", R: "龍" };
    return promoted[piece.kind] ?? "玉";
  }
  const glyphs: Record<ShogiKind, string> = { P: "歩", L: "香", N: "桂", S: "銀", G: "金", B: "角", R: "飛", K: "玉" };
  return glyphs[piece.kind];
}

function promotionZone(side: ShogiSide, row: number) {
  return side === "sente" ? row <= 2 : row >= 6;
}

function mustPromote(piece: ShogiPiece, row: number) {
  if (piece.promoted) return false;
  const dir = forward(piece.side);
  const lastRank = piece.side === "sente" ? 0 : 8;
  const lastTwoRanks = piece.side === "sente" ? row <= 1 : row >= 7;
  return ((piece.kind === "P" || piece.kind === "L") && row === lastRank)
    || (piece.kind === "N" && lastTwoRanks && (row === lastRank || row === lastRank - dir));
}

function addSteps(board: ShogiBoard, row: number, col: number, piece: ShogiPiece, steps: [number, number][], moves: ShogiPosition[]) {
  for (const [dr, dc] of steps) {
    const nextRow = row + dr;
    const nextCol = col + dc;
    if (!inBounds(nextRow, nextCol) || board[nextRow][nextCol]?.side === piece.side) continue;
    moves.push({ row: nextRow, col: nextCol });
  }
}

function addSlides(board: ShogiBoard, row: number, col: number, piece: ShogiPiece, directions: [number, number][], moves: ShogiPosition[]) {
  for (const [dr, dc] of directions) {
    let nextRow = row + dr;
    let nextCol = col + dc;
    while (inBounds(nextRow, nextCol)) {
      const occupant = board[nextRow][nextCol];
      if (occupant?.side === piece.side) break;
      moves.push({ row: nextRow, col: nextCol });
      if (occupant) break;
      nextRow += dr;
      nextCol += dc;
    }
  }
}

function pseudoDestinations(board: ShogiBoard, row: number, col: number, piece: ShogiPiece): ShogiPosition[] {
  const dir = forward(piece.side);
  const effectiveKind = piece.promoted && ["P", "L", "N", "S"].includes(piece.kind) ? "G" : piece.kind;
  const moves: ShogiPosition[] = [];
  if (effectiveKind === "P") addSteps(board, row, col, piece, [[dir, 0]], moves);
  if (effectiveKind === "L") addSlides(board, row, col, piece, [[dir, 0]], moves);
  if (effectiveKind === "N") addSteps(board, row, col, piece, [[2 * dir, -1], [2 * dir, 1]], moves);
  if (effectiveKind === "S") addSteps(board, row, col, piece, [[dir, 0], [dir, -1], [dir, 1], [-dir, -1], [-dir, 1]], moves);
  if (effectiveKind === "G") addSteps(board, row, col, piece, [[dir, 0], [dir, -1], [dir, 1], [0, -1], [0, 1], [-dir, 0]], moves);
  if (effectiveKind === "K") addSteps(board, row, col, piece, [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]], moves);
  if (effectiveKind === "B") addSlides(board, row, col, piece, [[-1, -1], [-1, 1], [1, -1], [1, 1]], moves);
  if (effectiveKind === "R") addSlides(board, row, col, piece, [[-1, 0], [1, 0], [0, -1], [0, 1]], moves);
  if (piece.promoted && piece.kind === "B") addSteps(board, row, col, piece, [[-1, 0], [1, 0], [0, -1], [0, 1]], moves);
  if (piece.promoted && piece.kind === "R") addSteps(board, row, col, piece, [[-1, -1], [-1, 1], [1, -1], [1, 1]], moves);
  return moves;
}

export function isShogiInCheck(state: ShogiState, side: ShogiSide): boolean {
  let king: ShogiPosition | null = null;
  for (let row = 0; row < 9; row++) for (let col = 0; col < 9; col++) {
    const piece = state.board[row][col];
    if (piece?.side === side && piece.kind === "K") king = { row, col };
  }
  if (!king) return true;
  for (let row = 0; row < 9; row++) for (let col = 0; col < 9; col++) {
    const piece = state.board[row][col];
    if (piece?.side !== side && piece) {
      if (pseudoDestinations(state.board, row, col, piece).some((move) => move.row === king?.row && move.col === king?.col)) return true;
    }
  }
  return false;
}

export function applyShogiAction(state: ShogiState, action: ShogiAction): ShogiState {
  const board = state.board.map((row) => row.slice());
  const hands: ShogiHands = { sente: [...state.hands.sente], gote: [...state.hands.gote] };
  if (action.drop) {
    const handIndex = hands[state.turn].indexOf(action.drop);
    if (handIndex >= 0) hands[state.turn].splice(handIndex, 1);
    board[action.to.row][action.to.col] = { side: state.turn, kind: action.drop, promoted: false };
  } else if (action.from) {
    const piece = board[action.from.row][action.from.col];
    const captured = board[action.to.row][action.to.col];
    if (captured && captured.kind !== "K") hands[state.turn].push(captured.kind);
    board[action.from.row][action.from.col] = null;
    if (piece) board[action.to.row][action.to.col] = { ...piece, promoted: piece.promoted || Boolean(action.promote) };
  }
  return { board, hands, turn: otherSide(state.turn) };
}

export function legalShogiMoves(state: ShogiState, row: number, col: number): ShogiAction[] {
  const piece = state.board[row]?.[col];
  if (!piece || piece.side !== state.turn) return [];
  const moves: ShogiAction[] = [];
  for (const to of pseudoDestinations(state.board, row, col, piece)) {
    if (state.board[to.row][to.col]?.kind === "K") continue;
    const canPromote = !piece.promoted && promotionKinds.has(piece.kind)
      && (promotionZone(piece.side, row) || promotionZone(piece.side, to.row));
    const promotions = mustPromote(piece, to.row) ? [true] : canPromote ? [false, true] : [false];
    for (const promote of promotions) {
      const action: ShogiAction = { from: { row, col }, to, promote };
      if (!isShogiInCheck(applyShogiAction(state, action), piece.side)) moves.push(action);
    }
  }
  return moves;
}

function canDrop(state: ShogiState, kind: ShogiKind, row: number, col: number) {
  if (state.board[row][col] !== null || !state.hands[state.turn].includes(kind)) return false;
  const lastRank = state.turn === "sente" ? 0 : 8;
  if ((kind === "P" || kind === "L") && row === lastRank) return false;
  if (kind === "N" && (state.turn === "sente" ? row <= 1 : row >= 7)) return false;
  if (kind === "P" && state.board.some((boardRow) => {
    const piece = boardRow[col];
    return piece?.side === state.turn && piece.kind === "P" && !piece.promoted;
  })) return false;
  return true;
}

export function legalShogiDrops(state: ShogiState, kind: ShogiKind, enforcePawnDropMate = true): ShogiAction[] {
  if (!state.hands[state.turn].includes(kind)) return [];
  const actions: ShogiAction[] = [];
  for (let row = 0; row < 9; row++) for (let col = 0; col < 9; col++) {
    if (!canDrop(state, kind, row, col)) continue;
    const action: ShogiAction = { to: { row, col }, drop: kind };
    const next = applyShogiAction(state, action);
    if (isShogiInCheck(next, state.turn)) continue;
    if (enforcePawnDropMate && kind === "P" && isShogiInCheck(next, next.turn) && !hasLegalShogiAction(next, next.turn, false)) continue;
    actions.push(action);
  }
  return actions;
}

export function hasLegalShogiAction(state: ShogiState, side: ShogiSide = state.turn, enforcePawnDropMate = true): boolean {
  const position = side === state.turn ? state : { ...state, turn: side };
  for (let row = 0; row < 9; row++) for (let col = 0; col < 9; col++) {
    const piece = position.board[row][col];
    if (piece?.side === side && legalShogiMoves(position, row, col).length > 0) return true;
  }
  for (const kind of new Set(position.hands[side])) {
    if (legalShogiDrops(position, kind, enforcePawnDropMate).length > 0) return true;
  }
  return false;
}

export function isShogiCheckmate(state: ShogiState, side: ShogiSide = state.turn): boolean {
  return isShogiInCheck(state, side) && !hasLegalShogiAction(state, side);
}

export function shogiHandOrder(hand: ShogiKind[]): ShogiKind[] {
  return handOrder.filter((kind) => hand.includes(kind));
}
