import { evaluateAchievements, localClock, longestStreak, type AchievementDef, type AchievementStats } from "@repo/core";
import { db } from "./client";
import { computeStreak } from "./progress";

const DAY = 86_400_000;

// ---------------- Achievements ----------------

export async function achievementStats(userId: string): Promise<AchievementStats> {
  const prisma = db();
  const [user, sessions, words, knownWords, messages, grammarMastered, ielts] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { cefrLevel: true } }),
    prisma.activitySession.findMany({ where: { userId }, select: { activityId: true, startedAt: true, endedAt: true } }),
    prisma.vocabItem.count({ where: { userId } }),
    prisma.vocabItem.count({ where: { userId, state: "REVIEW" } }),
    prisma.message.count({ where: { role: "USER", session: { userId } } }),
    prisma.grammarProgress.count({ where: { userId, mastery: { gte: 80 } } }),
    prisma.activitySession.findMany({ where: { userId, activityId: "ielts-speaking", endedAt: { not: null } }, select: { data: true } }),
  ]);

  const finished = (activityId: string) => sessions.filter((s) => s.activityId === activityId && s.endedAt).length;
  const dayKeys = sessions.map((s) => s.startedAt.toISOString().slice(0, 10));

  return {
    streak: computeStreak(sessions.map((s) => s.startedAt)),
    bestStreak: longestStreak(dayKeys),
    words,
    knownWords,
    messages,
    chats: sessions.filter((s) => s.activityId === "tutor-chat").length,
    grammarSessions: finished("grammar"),
    grammarMastered,
    dailyCompleted: finished("daily"),
    writings: finished("writing"),
    readings: finished("reading"),
    listenings: finished("listening"),
    pronunciationAttempts: sessions.filter((s) => s.activityId === "pronunciation").length,
    ieltsBestBand: Math.max(0, ...ielts.map((s) => Number((s.data as { feedback?: { overallBand?: number } } | null)?.feedback?.overallBand ?? 0))),
    level: user.cefrLevel,
  };
}

/** Recomputes badges, stores newly earned ones, and returns everything for display. */
export async function syncAchievements(userId: string) {
  const [stats, existing] = await Promise.all([achievementStats(userId), db().achievement.findMany({ where: { userId } })]);
  const earnedAt = new Map(existing.map((a) => [a.achievementId, a.earnedAt]));
  const evaluated = evaluateAchievements(stats);
  const fresh = evaluated.filter((a) => a.earned && !earnedAt.has(a.def.id));
  if (fresh.length) {
    await db().achievement.createMany({ data: fresh.map((a) => ({ userId, achievementId: a.def.id })), skipDuplicates: true });
  }
  const now = new Date();
  return {
    stats,
    achievements: evaluated.map((a) => ({ ...a, earnedAt: earnedAt.get(a.def.id) ?? (a.earned ? now : null) })),
    newlyEarned: fresh.map((a) => a.def) as AchievementDef[],
  };
}

// ---------------- Reminders & push ----------------

export async function savePushSubscription(userId: string, sub: { endpoint: string; p256dh: string; auth: string }) {
  await db().pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { userId, p256dh: sub.p256dh, auth: sub.auth },
    create: { userId, ...sub },
  });
}

export async function deletePushSubscription(endpoint: string) {
  await db().pushSubscription.deleteMany({ where: { endpoint } });
}

export async function listPushSubscriptions(userId: string) {
  return db().pushSubscription.findMany({ where: { userId }, select: { endpoint: true, p256dh: true, auth: true } });
}

export async function listReminderUserIds() {
  const users = await db().user.findMany({ where: { reminderEnabled: true, pushSubscriptions: { some: {} } }, select: { id: true } });
  return users.map((u) => u.id);
}

export async function markReminded(userId: string, at = new Date()) {
  await db().user.update({ where: { id: userId }, data: { lastReminderAt: at } });
}

/** Did the learner practise on today's local calendar day? */
export async function practisedToday(userId: string, timeZone: string, now = new Date()) {
  const today = localClock(now, timeZone).dateKey;
  const recent = await db().activitySession.findMany({
    where: { userId, startedAt: { gte: new Date(now.getTime() - 1.5 * DAY) }, activityId: { notIn: ["weekly-report"] } },
    select: { startedAt: true },
  });
  return recent.some((s) => localClock(s.startedAt, timeZone).dateKey === today);
}

export async function currentStreak(userId: string, now = new Date()) {
  const sessions = await db().activitySession.findMany({
    where: { userId, startedAt: { gte: new Date(now.getTime() - 400 * DAY) } },
    select: { startedAt: true },
  });
  return computeStreak(sessions.map((s) => s.startedAt), now);
}
