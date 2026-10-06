import { describe, expect, it } from "vitest";
import { createPuyoGame, hardDropPuyo, movePuyo, pairCells, resolvePuyoBoard, rotatePuyo, stepPuyo, type PuyoBoard } from "./puyoPuzzle";

describe("falling color puzzle", () => {
  it("spawns a pair and respects the board edge", () => {
    let game = createPuyoGame(() => 0);
    expect(pairCells(game.active)).toEqual([[1, 2, "red"], [0, 2, "red"]]);
    game = movePuyo(game, -1);
    game = movePuyo(game, -1);
    expect(movePuyo(game, -1)).toBe(game);
    expect(rotatePuyo(game).active.rotation).toBe(1);
  });

  it("hard drop locks the pair at the bottom", () => {
    const game = hardDropPuyo(createPuyoGame(() => 0), () => 0);
    expect(game.board[11 * 6 + 2]).toBe("red");
    expect(game.board[10 * 6 + 2]).toBe("red");
    expect(game.score).toBe(0);
  });

  it("clears four connected colors and applies gravity", () => {
    const board: PuyoBoard = Array(72).fill(null);
    for (let col = 0; col < 4; col++) board[11 * 6 + col] = "red";
    board[10 * 6] = "blue";
    const result = resolvePuyoBoard(board);
    expect(result.score).toBe(40);
    expect(result.chains).toBe(1);
    expect(result.board[11 * 6]).toBe("blue");
  });

  it("scores a second cascade as a chain", () => {
    const board: PuyoBoard = Array(72).fill(null);
    board[11 * 6] = board[11 * 6 + 1] = board[11 * 6 + 2] = board[10 * 6 + 2] = "red";
    board[10 * 6] = board[10 * 6 + 1] = board[10 * 6 + 3] = board[9 * 6 + 2] = "blue";
    const result = resolvePuyoBoard(board);
    expect(result.chains).toBe(2);
    expect(result.score).toBe(120);
    expect(result.board.every((color) => color === null)).toBe(true);
  });

  it("ends when the next pair cannot spawn", () => {
    const game = createPuyoGame(() => 0);
    game.board[2] = "blue";
    game.active = { colors: ["red", "red"], row: 11, col: 0, rotation: 1 };
    const next = stepPuyo(game, () => 0);
    expect(next.ended).toBe(true);
    expect(stepPuyo(next)).toBe(next);
  });
});
