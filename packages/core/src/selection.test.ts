import { describe, expect, it } from "vitest";
import { cleanSelection } from "./selection";

describe("cleanSelection", () => {
  it("trims whitespace and surrounding punctuation", () => {
    expect(cleanSelection('  "reluctant," ')).toBe("reluctant");
    expect(cleanSelection("give\n up!")).toBe("give up");
    expect(cleanSelection("don't")).toBe("don't");
  });

  it("rejects empty, long, non-English or sentence-length selections", () => {
    expect(cleanSelection("  ...  ")).toBeNull();
    expect(cleanSelection("one two three four five six seven")).toBeNull();
    expect(cleanSelection("a".repeat(61))).toBeNull();
    expect(cleanSelection("اردو")).toBeNull();
  });
});
