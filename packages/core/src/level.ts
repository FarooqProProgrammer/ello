import { CEFR_LEVELS, clampLevel, levelIndex, type CefrLevel } from "./domain";

export interface PlacementAnswer {
  /** The CEFR level the question targets. */
  level: CefrLevel;
  correct: boolean;
}

/**
 * Estimates a CEFR level from placement answers.
 * The learner is placed at the highest level where they answered at least 60%
 * correctly, provided every level below also meets that bar (no lucky jumps).
 */
export function estimatePlacementLevel(answers: PlacementAnswer[], passRate = 0.6): CefrLevel {
  let placed: CefrLevel = "A1";
  for (const level of CEFR_LEVELS) {
    const atLevel = answers.filter((a) => a.level === level);
    if (atLevel.length === 0) break;
    const rate = atLevel.filter((a) => a.correct).length / atLevel.length;
    if (rate < passRate) break;
    placed = level;
  }
  return placed;
}

/** Converts a 0–100 score at a given level into a skill score used for trends. */
export function normalizeScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

export interface LevelDecision {
  level: CefrLevel;
  changed: "up" | "down" | null;
}

/**
 * Moves the level only after consistent results:
 * up when the last `window` scored sessions all reach `upThreshold`,
 * down when they all fall below `downThreshold`.
 */
export function adjustLevel(
  current: CefrLevel,
  recentScores: number[],
  { window = 5, upThreshold = 85, downThreshold = 45 } = {},
): LevelDecision {
  if (recentScores.length < window) return { level: current, changed: null };
  const lastN = recentScores.slice(-window);
  const idx = levelIndex(current);
  if (lastN.every((s) => s >= upThreshold) && idx < CEFR_LEVELS.length - 1) {
    return { level: clampLevel(idx + 1), changed: "up" };
  }
  if (lastN.every((s) => s < downThreshold) && idx > 0) {
    return { level: clampLevel(idx - 1), changed: "down" };
  }
  return { level: current, changed: null };
}
