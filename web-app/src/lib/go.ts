export type Stone = "black" | "white";
export type GoBoard = (Stone | null)[];

export interface GoGame {
  board: GoBoard;
  turn: Stone;
  passes: number;
  finished: boolean;
  koBoard: GoBoard | null;
  captured: Record<Stone, number>;
  lastMove: number | null;
}

const size = 9;
const other = (stone: Stone): Stone => stone === "black" ? "white" : "black";

export function createGoGame(): GoGame {
  return {
    board: Array(size * size).fill(null),
    turn: "black",
    passes: 0,
    finished: false,
    koBoard: null,
    captured: { black: 0, white: 0 },
    lastMove: null,
  };
}

function neighbors(index: number): number[] {
  const row = Math.floor(index / size);
  const col = index % size;
  return [
    row > 0 ? index - size : -1,
    row < size - 1 ? index + size : -1,
    col > 0 ? index - 1 : -1,
    col < size - 1 ? index + 1 : -1,
  ].filter((neighbor) => neighbor >= 0);
}

function group(board: GoBoard, start: number): { stones: number[]; liberties: Set<number> } {
  const color = board[start];
  const seen = new Set([start]);
  const stack = [start];
  const liberties = new Set<number>();
  while (stack.length) {
    const point = stack.pop()!;
    for (const neighbor of neighbors(point)) {
      if (board[neighbor] === null) liberties.add(neighbor);
      else if (board[neighbor] === color && !seen.has(neighbor)) {
        seen.add(neighbor);
        stack.push(neighbor);
      }
    }
  }
  return { stones: [...seen], liberties };
}

export function placeStone(game: GoGame, index: number): GoGame {
  if (game.finished || !Number.isInteger(index) || index < 0 || index >= size * size || game.board[index] !== null) return game;
  const board = [...game.board];
  board[index] = game.turn;
  let captured = 0;
  const checked = new Set<number>();
  for (const neighbor of neighbors(index)) {
    if (board[neighbor] !== other(game.turn) || checked.has(neighbor)) continue;
    const opponent = group(board, neighbor);
    opponent.stones.forEach((stone) => checked.add(stone));
    if (opponent.liberties.size === 0) {
      opponent.stones.forEach((stone) => { board[stone] = null; });
      captured += opponent.stones.length;
    }
  }
  if (group(board, index).liberties.size === 0) return game;
  if (game.koBoard && board.every((stone, point) => stone === game.koBoard![point])) return game;
  return {
    board,
    turn: other(game.turn),
    passes: 0,
    finished: false,
    koBoard: game.board,
    captured: { ...game.captured, [game.turn]: game.captured[game.turn] + captured },
    lastMove: index,
  };
}

export function passTurn(game: GoGame): GoGame {
  if (game.finished) return game;
  return {
    ...game,
    turn: other(game.turn),
    passes: game.passes + 1,
    finished: game.passes >= 1,
    koBoard: null,
    lastMove: null,
  };
}

/** Chinese area scoring on the live board; white receives 5.5 komi. */
export function scoreGo(board: GoBoard): { black: number; white: number; blackTerritory: number; whiteTerritory: number } {
  let black = board.filter((stone) => stone === "black").length;
  let white = board.filter((stone) => stone === "white").length;
  let blackTerritory = 0;
  let whiteTerritory = 0;
  const visited = new Set<number>();
  for (let point = 0; point < board.length; point++) {
    if (board[point] !== null || visited.has(point)) continue;
    const stack = [point];
    const region: number[] = [];
    const borders = new Set<Stone>();
    visited.add(point);
    while (stack.length) {
      const current = stack.pop()!;
      region.push(current);
      for (const neighbor of neighbors(current)) {
        const stone = board[neighbor];
        if (stone) borders.add(stone);
        else if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }
    if (borders.size === 1) {
      if (borders.has("black")) blackTerritory += region.length;
      else whiteTerritory += region.length;
    }
  }
  black += blackTerritory;
  white += whiteTerritory + 5.5;
  return { black, white, blackTerritory, whiteTerritory };
}
