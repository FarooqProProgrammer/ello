import type { Skill, WeeklyStats } from "@repo/core";
import { db } from "./client";
import { computeStreak } from "./progress";

const DAY = 86_400_000;

function averages(rows: { skill: Skill; score: number }[]): Partial<Record<Skill, number>> {
  const sums = new Map<Skill, { total: number; n: number }>();
  for (const r of rows) {
    const s = sums.get(r.skill) ?? { total: 0, n: 0 };
    sums.set(r.skill, { total: s.total + r.score, n: s.n + 1 });
  }
  return Object.fromEntries([...sums].map(([skill, s]) => [skill, Math.round(s.total / s.n)]));
}

/** Numbers for the weekly report: activity, skill averages vs the previous week, mistakes and vocabulary. */
export async function weeklyStats(userId: string, to = new Date()): Promise<WeeklyStats> {
  const from = new Date(to.getTime() - 7 * DAY);
  const previousFrom = new Date(from.getTime() - 7 * DAY);
  const prisma = db();

  const [user, sessions, scores, previousScores, mistakes, newWords, messagesSent, recentSessions] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { cefrLevel: true } }),
    prisma.activitySession.findMany({
      where: { userId, startedAt: { gte: from, lte: to }, activityId: { notIn: ["weekly-report"] } },
      select: { activityId: true, startedAt: true },
    }),
    prisma.skillScore.findMany({ where: { userId, recordedAt: { gte: from, lte: to } }, select: { skill: true, score: true } }),
    prisma.skillScore.findMany({ where: { userId, recordedAt: { gte: previousFrom, lt: from } }, select: { skill: true, score: true } }),
    prisma.mistake.groupBy({
      by: ["category"],
      where: { userId, createdAt: { gte: from, lte: to } },
      _count: { _all: true },
      orderBy: { _count: { category: "desc" } },
      take: 5,
    }),
    prisma.vocabItem.count({ where: { userId, createdAt: { gte: from, lte: to } } }),
    prisma.message.count({ where: { role: "USER", createdAt: { gte: from, lte: to }, session: { userId } } }),
    prisma.activitySession.findMany({ where: { userId, startedAt: { gte: new Date(to.getTime() - 60 * DAY) } }, select: { startedAt: true } }),
  ]);

  const sessionsByActivity: Record<string, number> = {};
  for (const s of sessions) sessionsByActivity[s.activityId] = (sessionsByActivity[s.activityId] ?? 0) + 1;

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    level: user.cefrLevel,
    activeDays: new Set(sessions.map((s) => s.startedAt.toISOString().slice(0, 10))).size,
    streak: computeStreak(recentSessions.map((s) => s.startedAt), to),
    sessionsByActivity,
    skillAverages: averages(scores),
    previousSkillAverages: averages(previousScores),
    topMistakes: mistakes.map((m) => ({ category: m.category, count: m._count._all })),
    newWords,
    messagesSent,
  };
}

/** Scores of the learner's most recent graded chat messages, newest first (for adaptive difficulty). */
export async function recentMessageScores(userId: string, limit = 8): Promise<number[]> {
  const rows = await db().message.findMany({
    where: { role: "USER", session: { userId, activityId: "tutor-chat" } },
    orderBy: { createdAt: "desc" },
    take: limit * 2,
    select: { analysis: true },
  });
  return rows
    .map((r) => (r.analysis as { score?: unknown } | null)?.score)
    .filter((s): s is number => typeof s === "number")
    .slice(0, limit);
}
