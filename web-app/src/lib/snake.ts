export type SnakePoint = { row: number; col: number };
export type SnakeDirection = "up" | "down" | "left" | "right";

export type SnakeGameState = {
  size: number;
  snake: SnakePoint[];
  food: SnakePoint;
  direction: SnakeDirection;
  queuedDirection: SnakeDirection;
  score: number;
  ended: boolean;
};

const opposite: Record<SnakeDirection, SnakeDirection> = {
  up: "down", down: "up", left: "right", right: "left",
};
const movement: Record<SnakeDirection, SnakePoint> = {
  up: { row: -1, col: 0 }, down: { row: 1, col: 0 },
  left: { row: 0, col: -1 }, right: { row: 0, col: 1 },
};
const samePoint = (a: SnakePoint, b: SnakePoint) => a.row === b.row && a.col === b.col;

export function placeSnakeFood(size: number, snake: SnakePoint[], random = Math.random): SnakePoint {
  const empty: SnakePoint[] = [];
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    if (!snake.some((point) => point.row === row && point.col === col)) empty.push({ row, col });
  }
  return empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))] ?? { row: -1, col: -1 };
}

export function createSnakeGame(size = 16, random = Math.random): SnakeGameState {
  const center = Math.floor(size / 2);
  const snake = [
    { row: center, col: center },
    { row: center, col: center - 1 },
    { row: center, col: center - 2 },
  ];
  return { size, snake, food: placeSnakeFood(size, snake, random), direction: "right", queuedDirection: "right", score: 0, ended: false };
}

export function turnSnake(game: SnakeGameState, direction: SnakeDirection): SnakeGameState {
  if (game.ended || opposite[game.direction] === direction) return game;
  return { ...game, queuedDirection: direction };
}

export function stepSnake(game: SnakeGameState, random = Math.random): SnakeGameState {
  if (game.ended) return game;
  const direction = game.queuedDirection;
  const delta = movement[direction];
  const head = game.snake[0];
  const nextHead = { row: head.row + delta.row, col: head.col + delta.col };
  const ate = samePoint(nextHead, game.food);
  const collisionBody = ate ? game.snake : game.snake.slice(0, -1);
  const hitWall = nextHead.row < 0 || nextHead.col < 0 || nextHead.row >= game.size || nextHead.col >= game.size;
  if (hitWall || collisionBody.some((point) => samePoint(point, nextHead))) return { ...game, direction, ended: true };
  const snake = [nextHead, ...game.snake];
  if (!ate) snake.pop();
  return {
    ...game, snake, direction,
    food: ate ? placeSnakeFood(game.size, snake, random) : game.food,
    score: game.score + (ate ? 10 : 0),
    ended: snake.length === game.size * game.size,
  };
}
