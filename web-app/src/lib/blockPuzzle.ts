export type Cell = readonly [row: number, col: number];
export type Piece = { name: string; cells: readonly Cell[] };

export const blockPieces: readonly Piece[] = [
  { name: "1", cells: [[0, 0]] },
  { name: "2横", cells: [[0, 0], [0, 1]] },
  { name: "2縦", cells: [[0, 0], [1, 0]] },
  { name: "3横", cells: [[0, 0], [0, 1], [0, 2]] },
  { name: "3縦", cells: [[0, 0], [1, 0], [2, 0]] },
  { name: "L", cells: [[0, 0], [1, 0], [1, 1]] },
  { name: "逆L", cells: [[0, 0], [0, 1], [1, 1]] },
  { name: "2×2", cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { name: "T", cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  { name: "3×3", cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]] },
];

export interface BlockGame {
  board: boolean[];
  tray: (number | null)[];
  score: number;
  lines: number;
  ended: boolean;
}

const size = 8;
const nextTray = (random: () => number) =>
  Array.from({ length: 3 }, () => Math.min(blockPieces.length - 1, Math.max(0, Math.floor(random() * blockPieces.length))));

export function canPlaceBlock(board: readonly boolean[], piece: Piece, row: number, col: number): boolean {
  if (!Number.isInteger(row) || !Number.isInteger(col)) return false;
  return piece.cells.every(([dr, dc]) => {
    const r = row + dr;
    const c = col + dc;
    return r >= 0 && r < size && c >= 0 && c < size && !board[r * size + c];
  });
}

export function hasBlockMove(board: readonly boolean[], tray: readonly (number | null)[]): boolean {
  return tray.some((pieceIndex) => pieceIndex !== null &&
    Array.from({ length: size * size }, (_, index) =>
      canPlaceBlock(board, blockPieces[pieceIndex], Math.floor(index / size), index % size)).some(Boolean));
}

export function createBlockGame(random: () => number = Math.random): BlockGame {
  return { board: Array(size * size).fill(false), tray: nextTray(random), score: 0, lines: 0, ended: false };
}

export function placeBlock(game: BlockGame, trayIndex: number, row: number, col: number, random: () => number = Math.random): BlockGame {
  const pieceIndex = game.tray[trayIndex];
  if (game.ended || pieceIndex === null || pieceIndex === undefined) return game;
  const piece = blockPieces[pieceIndex];
  if (!canPlaceBlock(game.board, piece, row, col)) return game;

  const board = [...game.board];
  for (const [dr, dc] of piece.cells) board[(row + dr) * size + col + dc] = true;
  const rows = Array.from({ length: size }, (_, r) => r).filter((r) =>
    Array.from({ length: size }, (_, c) => board[r * size + c]).every(Boolean));
  const cols = Array.from({ length: size }, (_, c) => c).filter((c) =>
    Array.from({ length: size }, (_, r) => board[r * size + c]).every(Boolean));
  for (const r of rows) for (let c = 0; c < size; c++) board[r * size + c] = false;
  for (const c of cols) for (let r = 0; r < size; r++) board[r * size + c] = false;

  const tray = [...game.tray];
  tray[trayIndex] = null;
  const available = tray.every((item) => item === null) ? nextTray(random) : tray;
  const cleared = rows.length + cols.length;
  return {
    board,
    tray: available,
    score: game.score + piece.cells.length + cleared * 10,
    lines: game.lines + cleared,
    ended: !hasBlockMove(board, available),
  };
}
