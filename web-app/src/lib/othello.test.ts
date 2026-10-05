import { describe, expect, it } from "vitest";
import { createGame, flipsForMove, legalMoves, playMove, score, type Board, type OthelloGame } from "./othello";

describe("Othello rules", () => {
  it("starts with four discs and four legal black moves", () => {
    const game = createGame();
    expect(score(game.board)).toEqual({ black: 2, white: 2 });
    expect(legalMoves(game.board, "black")).toEqual([19, 26, 37, 44]);
  });

  it("flips captured discs and rejects illegal moves", () => {
    const game = createGame();
    expect(flipsForMove(game.board, 19, "black")).toEqual([27]);
    expect(playMove(game, 0)).toBe(game);
    const next = playMove(game, 19);
    expect(score(next.board)).toEqual({ black: 4, white: 1 });
    expect(next.turn).toBe("white");
    expect(score(game.board)).toEqual({ black: 2, white: 2 });
  });

  it("passes automatically when the next player has no legal move", () => {
    const board: Board = Array(64).fill("black");
    board[0] = null;
    board[1] = "white";
    board[8] = null;
    board[9] = "white";
    board[16] = "white";
    const game: OthelloGame = { board, turn: "black", finished: false, passed: null };
    const next = playMove(game, 0);
    expect(next.finished).toBe(false);
    expect(next.turn).toBe("black");
    expect(next.passed).toBe("white");
    expect(legalMoves(next.board, "black")).toEqual([8]);
  });

  it("finishes when neither player can move", () => {
    const board: Board = Array(64).fill("black");
    board[0] = null;
    board[1] = "white";
    const game: OthelloGame = { board, turn: "black", finished: false, passed: null };
    const next = playMove(game, 0);
    expect(next.finished).toBe(true);
    expect(score(next.board)).toEqual({ black: 64, white: 0 });
    expect(playMove(next, 1)).toBe(next);
  });
});
