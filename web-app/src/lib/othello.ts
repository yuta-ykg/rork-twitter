export type Disc = "black" | "white";
export type Board = (Disc | null)[];

export interface OthelloGame {
  board: Board;
  turn: Disc;
  finished: boolean;
  passed: Disc | null;
}

const directions = [-1, 0, 1].flatMap((dr) =>
  [-1, 0, 1].filter((dc) => dr !== 0 || dc !== 0).map((dc) => [dr, dc] as const),
);

export function other(player: Disc): Disc {
  return player === "black" ? "white" : "black";
}

export function createGame(): OthelloGame {
  const board: Board = Array(64).fill(null);
  board[3 * 8 + 3] = "white";
  board[3 * 8 + 4] = "black";
  board[4 * 8 + 3] = "black";
  board[4 * 8 + 4] = "white";
  return { board, turn: "black", finished: false, passed: null };
}

export function flipsForMove(board: Board, index: number, player: Disc): number[] {
  if (!Number.isInteger(index) || index < 0 || index >= 64 || board[index] !== null) return [];
  const row = Math.floor(index / 8);
  const col = index % 8;
  const opponent = other(player);
  const flips: number[] = [];
  for (const [dr, dc] of directions) {
    const line: number[] = [];
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === opponent) {
      line.push(r * 8 + c);
      r += dr;
      c += dc;
    }
    if (line.length > 0 && r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === player) {
      flips.push(...line);
    }
  }
  return flips;
}

export function legalMoves(board: Board, player: Disc): number[] {
  return board.flatMap((_, index) => flipsForMove(board, index, player).length ? [index] : []);
}

const positionWeights = [
  120, -35, 20, 20, 20, 20, -35, 120,
  -35, -50, -5, -5, -5, -5, -50, -35,
  20, -5, 10, 4, 4, 10, -5, 20,
  20, -5, 4, 2, 2, 4, -5, 20,
  20, -5, 4, 2, 2, 4, -5, 20,
  20, -5, 10, 4, 4, 10, -5, 20,
  -35, -50, -5, -5, -5, -5, -50, -35,
  120, -35, 20, 20, 20, 20, -35, 120,
];

/** One-ply, deterministic CPU: prefer stable squares and limit the opponent's options. */
export function chooseCpuMove(board: Board, player: Disc): number | null {
  const moves = legalMoves(board, player);
  if (!moves.length) return null;
  let best = moves[0];
  let bestValue = -Infinity;
  for (const move of moves) {
    const flips = flipsForMove(board, move, player);
    const next = [...board];
    next[move] = player;
    for (const index of flips) next[index] = player;
    const value = positionWeights[move] + flips.length * 2 - legalMoves(next, other(player)).length * 3;
    if (value > bestValue) {
      best = move;
      bestValue = value;
    }
  }
  return best;
}

export function playMove(game: OthelloGame, index: number): OthelloGame {
  if (game.finished) return game;
  const flips = flipsForMove(game.board, index, game.turn);
  if (!flips.length) return game;
  const board = [...game.board];
  board[index] = game.turn;
  for (const flipped of flips) board[flipped] = game.turn;
  const next = other(game.turn);
  if (legalMoves(board, next).length) return { board, turn: next, finished: false, passed: null };
  if (legalMoves(board, game.turn).length) return { board, turn: game.turn, finished: false, passed: next };
  return { board, turn: game.turn, finished: true, passed: null };
}

export function score(board: Board): { black: number; white: number } {
  return {
    black: board.filter((disc) => disc === "black").length,
    white: board.filter((disc) => disc === "white").length,
  };
}
