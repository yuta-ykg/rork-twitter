import { describe, expect, it } from "vitest";
import { blockPieces, canPlaceBlock, createBlockGame, hasBlockMove, placeBlock } from "./blockPuzzle";

describe("8x8 block puzzle", () => {
  it("starts with an empty board and three pieces", () => {
    const game = createBlockGame(() => 0);
    expect(game.board).toHaveLength(64);
    expect(game.board.every((cell) => !cell)).toBe(true);
    expect(game.tray).toEqual([0, 0, 0]);
  });

  it("rejects overlap and pieces outside the board", () => {
    const game = createBlockGame(() => 0);
    const next = placeBlock(game, 0, 0, 0, () => 0);
    expect(placeBlock(next, 1, 0, 0)).toBe(next);
    expect(canPlaceBlock(next.board, blockPieces[7], 7, 7)).toBe(false);
    expect(canPlaceBlock(next.board, blockPieces[0], 0.5, 0)).toBe(false);
  });

  it("clears a full row and column at the same time", () => {
    const game = createBlockGame(() => 0);
    for (let index = 1; index < 8; index++) {
      game.board[index] = true;
      game.board[index * 8] = true;
    }
    const next = placeBlock(game, 0, 0, 0, () => 0);
    expect(next.board.every((cell) => !cell)).toBe(true);
    expect(next.lines).toBe(2);
    expect(next.score).toBe(21);
  });

  it("refills the tray after all three pieces are placed", () => {
    let game = createBlockGame(() => 0);
    game = placeBlock(game, 0, 0, 0, () => 0);
    game = placeBlock(game, 1, 0, 1, () => 0);
    game = placeBlock(game, 2, 0, 2, () => 0);
    expect(game.tray).toEqual([0, 0, 0]);
  });

  it("ends when no remaining piece can fit", () => {
    const game = createBlockGame(() => 0);
    game.board = Array.from({ length: 64 }, (_, index) =>
      (Math.floor(index / 8) + index % 8) % 2 === 0);
    game.board[0] = false;
    game.tray = [0, 7, null];
    const next = placeBlock(game, 0, 0, 0, () => 0);
    expect(next.ended).toBe(true);
    expect(hasBlockMove(next.board, next.tray)).toBe(false);
  });
});
