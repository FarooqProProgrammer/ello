import type { CefrLevel, Skill } from "./domain";

// ---------------- Adaptive chat difficulty ----------------

export type ChatDifficulty = "simplify" | "normal" | "stretch";

/** Recent message scores → how the tutor should pitch its language. Needs a few samples before adapting. */
export function adaptiveDifficulty(recentScores: number[], { window = 6, minSamples = 3 } = {}): { mode: ChatDifficulty; average: number | null } {
  const scores = recentScores.slice(0, window);
  if (scores.length < minSamples) return { mode: "normal", average: null };
  const average = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  return { mode: average < 55 ? "simplify" : average >= 85 ? "stretch" : "normal", average };
}

export const DIFFICULTY_INSTRUCTIONS: Record<ChatDifficulty, string | null> = {
  simplify:
    "Adaptive difficulty: the learner has been struggling in recent messages. Use shorter, simpler sentences and more common words than usual, ask one easy question at a time, and clearly model the correct forms.",
  normal: null,
  stretch:
    "Adaptive difficulty: the learner is doing very well recently. Gently stretch them: use slightly richer vocabulary and more varied structures than their level, and ask open questions that need longer, more detailed answers.",
};

// ---------------- Weekly report ----------------

/** ISO-8601 week key, e.g. "2026-W38", computed in the learner's time zone. */
export function isoWeekKey(date = new Date(), timeZone = "Asia/Karachi"): string {
  const local = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const [y, m, d] = local.split("-").map(Number);
  const day = new Date(Date.UTC(y!, m! - 1, d!));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday); // Thursday decides the ISO year
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((day.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export interface WeeklyStats {
  from: string;
  to: string;
  level: CefrLevel;
  activeDays: number;
  streak: number;
  sessionsByActivity: Record<string, number>;
  skillAverages: Partial<Record<Skill, number>>;
  previousSkillAverages: Partial<Record<Skill, number>>;
  topMistakes: { category: string; count: number }[];
  newWords: number;
  messagesSent: number;
}
