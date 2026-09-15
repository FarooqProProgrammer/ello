import { describe, expect, it } from "vitest";
import { acceptNewFacts, isDuplicateFact, normalizeFact } from "./memory";

describe("memory facts", () => {
  it("normalizes whitespace and trailing punctuation", () => {
    expect(normalizeFact("  Works as a   developer. ")).toBe("Works as a developer");
  });

  it("detects duplicates ignoring case and 'The learner' prefix", () => {
    expect(isDuplicateFact(["Works as a MERN developer"], "The learner works as a MERN developer.")).toBe(true);
    expect(isDuplicateFact(["Likes cricket"], "Has a job interview next week")).toBe(false);
  });

  it("accepts at most two new, valid, unique facts", () => {
    const out = acceptNewFacts(["Lives in Lahore"], ["lives in lahore", "ok", "Has a job interview on Friday", "Enjoys watching cricket", "Wants to study in Canada"]);
    expect(out).toEqual(["Has a job interview on Friday", "Enjoys watching cricket"]);
  });
});
