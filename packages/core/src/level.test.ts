import { describe, expect, it } from "vitest";
import { adjustLevel, estimatePlacementLevel, type PlacementAnswer } from "./level";

const answers = (level: PlacementAnswer["level"], correct: number, total: number): PlacementAnswer[] =>
  Array.from({ length: total }, (_, i) => ({ level, correct: i < correct }));

describe("estimatePlacementLevel", () => {
  it("defaults to A1 with no answers", () => {
    expect(estimatePlacementLevel([])).toBe("A1");
  });

  it("places at the highest consecutive passed level", () => {
    const result = estimatePlacementLevel([
      ...answers("A1", 3, 3),
      ...answers("A2", 3, 3),
      ...answers("B1", 2, 3),
      ...answers("B2", 1, 3),
      ...answers("C1", 3, 3),
    ]);
    expect(result).toBe("B1");
  });

  it("does not skip a failed lower level", () => {
    expect(estimatePlacementLevel([...answers("A1", 0, 3), ...answers("A2", 3, 3)])).toBe("A1");
  });
});

describe("adjustLevel", () => {
  it("needs a full window of scores", () => {
    expect(adjustLevel("B1", [95, 95, 95])).toEqual({ level: "B1", changed: null });
  });

  it("moves up after consistent high scores", () => {
    expect(adjustLevel("B1", [90, 88, 92, 86, 95])).toEqual({ level: "B2", changed: "up" });
  });

  it("moves down after consistent low scores but never below A1", () => {
    expect(adjustLevel("B1", [30, 40, 20, 10, 44])).toEqual({ level: "A2", changed: "down" });
    expect(adjustLevel("A1", [0, 0, 0, 0, 0])).toEqual({ level: "A1", changed: null });
  });

  it("stays put on mixed results", () => {
    expect(adjustLevel("C1", [90, 40, 90, 90, 90])).toEqual({ level: "C1", changed: null });
  });
});
