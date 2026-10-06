import { describe, expect, it } from "vitest";
import { createGoGame, passTurn, placeStone, scoreGo, type GoBoard, type GoGame } from "./go";

function position(board: GoBoard, turn: GoGame["turn"] = "black"): GoGame {
  return { ...createGoGame(), board, turn };
}

describe("9x9 Go", () => {
  it("starts with an empty board and alternates turns", () => {
    const start = createGoGame();
    expect(start.board).toHaveLength(81);
    const next = placeStone(start, 40);
    expect(next.board[40]).toBe("black");
    expect(next.turn).toBe("white");
    expect(placeStone(next, 40)).toBe(next);
  });

  it("captures a group with no liberties", () => {
    const board: GoBoard = Array(81).fill(null);
    board[10] = "white";
    board[1] = board[9] = board[11] = "black";
    const next = placeStone(position(board), 19);
    expect(next.board[10]).toBeNull();
    expect(next.captured.black).toBe(1);
  });

  it("rejects suicide", () => {
    const board: GoBoard = Array(81).fill(null);
    board[1] = board[9] = board[11] = board[19] = "black";
    const start = position(board, "white");
    expect(placeStone(start, 10)).toBe(start);
  });

  it("prevents immediate ko recapture", () => {
    const board: GoBoard = Array(81).fill(null);
    board[11] = board[1] = board[19] = board[9] = "white";
    board[2] = board[20] = board[12] = "black";
    const captured = placeStone(position(board), 10);
    expect(captured.board[11]).toBeNull();
    expect(placeStone(captured, 11)).toBe(captured);
  });

  it("ends after two passes and counts enclosed territory with komi", () => {
    const board: GoBoard = Array(81).fill("black");
    board[40] = null;
    const start = position(board);
    const first = passTurn(start);
    expect(first.finished).toBe(false);
    const second = passTurn(first);
    expect(second.finished).toBe(true);
    expect(placeStone(second, 40)).toBe(second);
    expect(scoreGo(board)).toEqual({ black: 81, white: 5.5, blackTerritory: 1, whiteTerritory: 0 });
  });
});
