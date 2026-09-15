import { SKILLS, type Skill } from "@repo/core";
import { db } from "./client";
import { getWeakAreas } from "./users";

export interface SkillTrendPoint {
  score: number;
  recordedAt: Date;
}

/** Days in a row (ending today or yesterday) with at least one finished or active session. */
export function computeStreak(activityDates: Date[], now = new Date()): number {
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const days = new Set(activityDates.map(dayKey));
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export async function getProgress(userId: string) {
  const prisma = db();
  const since = new Date(Date.now() - 90 * 86_400_000);
  const [scores, sessions, weakAreas, vocabByState, mistakeTotals] = await Promise.all([
    prisma.skillScore.findMany({
      where: { userId, recordedAt: { gte: since } },
      orderBy: { recordedAt: "asc" },
    }),
    prisma.activitySession.findMany({
      where: { userId, startedAt: { gte: since } },
      select: { startedAt: true, activityId: true },
    }),
    getWeakAreas(userId, { days: 30, limit: 8 }),
    prisma.vocabItem.groupBy({ by: ["state"], where: { userId }, _count: { _all: true } }),
    prisma.mistake.groupBy({ by: ["type"], where: { userId, createdAt: { gte: since } }, _count: { _all: true } }),
  ]);

  const trends = Object.fromEntries(SKILLS.map((s) => [s, [] as SkillTrendPoint[]])) as Record<Skill, SkillTrendPoint[]>;
  for (const s of scores) trends[s.skill].push({ score: s.score, recordedAt: s.recordedAt });

  const latest = Object.fromEntries(
    SKILLS.map((s) => {
      const points = trends[s].slice(-5);
      const avg = points.length ? points.reduce((a, p) => a + p.score, 0) / points.length : null;
      return [s, avg];
    }),
  ) as Record<Skill, number | null>;

  return {
    streak: computeStreak(sessions.map((s) => s.startedAt)),
    activeDays: [...new Set(sessions.map((s) => s.startedAt.toISOString().slice(0, 10)))],
    sessionsLast7Days: sessions.filter((s) => s.startedAt.getTime() > Date.now() - 7 * 86_400_000).length,
    trends,
    latest,
    weakAreas,
    vocab: Object.fromEntries(vocabByState.map((v) => [v.state, v._count._all])),
    mistakesByType: Object.fromEntries(mistakeTotals.map((m) => [m.type, m._count._all])),
  };
}

export type Progress = Awaited<ReturnType<typeof getProgress>>;
