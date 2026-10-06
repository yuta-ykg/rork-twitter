import { describe, expect, it } from "vitest";
import { createSnakeGame, placeSnakeFood, stepSnake, turnSnake, type SnakeGameState } from "./snake";

describe("snake", () => {
  it("starts in the center and moves right", () => {
    const game = createSnakeGame(8, () => 0);
    expect(game.snake).toHaveLength(3);
    expect(stepSnake(game).snake[0]).toEqual({ row: 4, col: 5 });
  });
  it("does not allow an immediate reverse turn", () => {
    const game = createSnakeGame(8);
    expect(turnSnake(game, "left")).toBe(game);
    expect(turnSnake(game, "up").queuedDirection).toBe("up");
  });
  it("grows and scores after eating food", () => {
    const game = { ...createSnakeGame(8), food: { row: 4, col: 5 } };
    const next = stepSnake(game, () => 0);
    expect(next.snake).toHaveLength(4);
    expect(next.score).toBe(10);
  });
  it("ends after hitting a wall", () => {
    const game: SnakeGameState = {
      size: 4, snake: [{ row: 0, col: 3 }, { row: 0, col: 2 }],
      food: { row: 3, col: 3 }, direction: "right", queuedDirection: "right", score: 0, ended: false,
    };
    expect(stepSnake(game).ended).toBe(true);
  });
  it("never places food on the snake", () => {
    const snake = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
    expect(placeSnakeFood(2, snake, () => 0)).toEqual({ row: 1, col: 0 });
  });
});
