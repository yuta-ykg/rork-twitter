export type PuyoColor = "red" | "blue" | "green" | "yellow";
export type PuyoBoard = (PuyoColor | null)[];
export type PuyoPair = { colors: readonly [PuyoColor, PuyoColor]; row: number; col: number; rotation: number };

export interface PuyoGame {
  board: PuyoBoard;
  active: PuyoPair;
  next: readonly [PuyoColor, PuyoColor];
  score: number;
  lastChain: number;
  ended: boolean;
}

const width = 6;
const height = 12;
const colors: readonly PuyoColor[] = ["red", "blue", "green", "yellow"];
const offsets: readonly (readonly [number, number])[] = [[-1, 0], [0, 1], [1, 0], [0, -1]];

const randomPair = (random: () => number): readonly [PuyoColor, PuyoColor] => [
  colors[Math.min(3, Math.max(0, Math.floor(random() * colors.length)))],
  colors[Math.min(3, Math.max(0, Math.floor(random() * colors.length)))],
];

export function pairCells(pair: PuyoPair): readonly [number, number, PuyoColor][] {
  const [dr, dc] = offsets[((pair.rotation % 4) + 4) % 4];
  return [[pair.row, pair.col, pair.colors[0]], [pair.row + dr, pair.col + dc, pair.colors[1]]];
}

function fits(board: PuyoBoard, pair: PuyoPair): boolean {
  return pairCells(pair).every(([row, col]) =>
    row >= 0 && row < height && col >= 0 && col < width && board[row * width + col] === null);
}

export function createPuyoGame(random: () => number = Math.random): PuyoGame {
  return {
    board: Array(width * height).fill(null),
    active: { colors: randomPair(random), row: 1, col: 2, rotation: 0 },
    next: randomPair(random),
    score: 0,
    lastChain: 0,
    ended: false,
  };
}

export function movePuyo(game: PuyoGame, direction: -1 | 1): PuyoGame {
  if (game.ended) return game;
  const active = { ...game.active, col: game.active.col + direction };
  return fits(game.board, active) ? { ...game, active } : game;
}

export function rotatePuyo(game: PuyoGame): PuyoGame {
  if (game.ended) return game;
  for (const kick of [0, -1, 1]) {
    const active = { ...game.active, col: game.active.col + kick, rotation: (game.active.rotation + 1) % 4 };
    if (fits(game.board, active)) return { ...game, active };
  }
  return game;
}

function connected(board: PuyoBoard, start: number, visited: Set<number>): number[] {
  const color = board[start];
  const group = [start];
  visited.add(start);
  for (let index = 0; index < group.length; index++) {
    const point = group[index];
    const row = Math.floor(point / width);
    const col = point % width;
    const neighbors = [
      row > 0 ? point - width : -1,
      row < height - 1 ? point + width : -1,
      col > 0 ? point - 1 : -1,
      col < width - 1 ? point + 1 : -1,
    ];
    for (const neighbor of neighbors) {
      if (neighbor >= 0 && board[neighbor] === color && !visited.has(neighbor)) {
        visited.add(neighbor);
        group.push(neighbor);
      }
    }
  }
  return group;
}

export function resolvePuyoBoard(source: PuyoBoard): { board: PuyoBoard; score: number; chains: number } {
  const board = [...source];
  let score = 0;
  let chains = 0;
  while (true) {
    const visited = new Set<number>();
    const clear = new Set<number>();
    for (let point = 0; point < board.length; point++) {
      if (board[point] === null || visited.has(point)) continue;
      const group = connected(board, point, visited);
      if (group.length >= 4) group.forEach((index) => clear.add(index));
    }
    if (!clear.size) break;
    chains++;
    score += clear.size * 10 * chains;
    clear.forEach((point) => { board[point] = null; });
    for (let col = 0; col < width; col++) {
      const remaining = Array.from({ length: height }, (_, row) => board[row * width + col])
        .filter((color): color is PuyoColor => color !== null);
      for (let row = height - 1; row >= 0; row--) {
        board[row * width + col] = remaining.pop() ?? null;
      }
    }
  }
  return { board, score, chains };
}

function lockPair(game: PuyoGame, random: () => number): PuyoGame {
  const board = [...game.board];
  for (const [row, col, color] of pairCells(game.active)) board[row * width + col] = color;
  const resolved = resolvePuyoBoard(board);
  const active: PuyoPair = { colors: game.next, row: 1, col: 2, rotation: 0 };
  return {
    board: resolved.board,
    active,
    next: randomPair(random),
    score: game.score + resolved.score,
    lastChain: resolved.chains,
    ended: !fits(resolved.board, active),
  };
}

export function stepPuyo(game: PuyoGame, random: () => number = Math.random): PuyoGame {
  if (game.ended) return game;
  const active = { ...game.active, row: game.active.row + 1 };
  return fits(game.board, active) ? { ...game, active } : lockPair(game, random);
}

export function hardDropPuyo(game: PuyoGame, random: () => number = Math.random): PuyoGame {
  if (game.ended) return game;
  let falling = game;
  while (true) {
    const next = stepPuyo(falling, random);
    if (next.board !== game.board) return next;
    falling = next;
  }
}
