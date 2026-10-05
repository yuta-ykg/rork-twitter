import { validateCommunity } from "../lib/communities";

test("community names and descriptions use Unicode code point limits", () => {
  expect(() => validateCommunity("😀".repeat(40), "あ".repeat(160))).not.toThrow();
  expect(() => validateCommunity("😀".repeat(41), "")).toThrow();
  expect(() => validateCommunity("   ", "")).toThrow();
  expect(() => validateCommunity("Valid", "あ".repeat(161))).toThrow();
});
