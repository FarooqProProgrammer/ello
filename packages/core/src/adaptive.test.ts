import { describe, expect, it } from "vitest";
import { adaptiveDifficulty, DIFFICULTY_INSTRUCTIONS, isoWeekKey } from "./adaptive";

describe("adaptiveDifficulty", () => {
  it("stays normal until there are enough samples", () => {
    expect(adaptiveDifficulty([20, 30])).toEqual({ mode: "normal", average: null });
  });

  it("simplifies when struggling and stretches when strong", () => {
    expect(adaptiveDifficulty([40, 50, 60]).mode).toBe("simplify");
    expect(adaptiveDifficulty([90, 88, 95, 85]).mode).toBe("stretch");
    expect(adaptiveDifficulty([70, 75, 80]).mode).toBe("normal");
    expect(DIFFICULTY_INSTRUCTIONS.normal).toBeNull();
  });

  it("only looks at the most recent window", () => {
    expect(adaptiveDifficulty([90, 90, 90, 90, 90, 90, 10, 10, 10]).mode).toBe("stretch");
  });
});

describe("isoWeekKey", () => {
  it("computes ISO weeks, including year boundaries", () => {
    expect(isoWeekKey(new Date("2026-09-15T10:00:00Z"))).toBe("2026-W38");
    expect(isoWeekKey(new Date("2027-01-01T10:00:00Z"))).toBe("2026-W53");
  });
});
