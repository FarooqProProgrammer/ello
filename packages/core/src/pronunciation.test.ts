import { describe, expect, it } from "vitest";
import { compareWords } from "./pronunciation";

describe("compareWords", () => {
  it("marks misheard words and scores the rest", () => {
    const { words, score } = compareWords("I think this is great!", "i sink this is great");
    expect(words.map((w) => w.ok)).toEqual([true, false, true, true, true]);
    expect(words[4]?.word).toBe("great!");
    expect(score).toBe(80);
  });

  it("handles extra or missing words and apostrophes", () => {
    expect(compareWords("I don't want it", "um I don’t really want it").score).toBe(100);
    expect(compareWords("Three thin thieves", "").score).toBe(0);
  });
});
