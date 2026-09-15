import { db } from "./client";

const LEGACY_USER_ID = "default-user";

// ---------------- Usage limits ----------------

export function usageDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Counts one AI request for today and returns the new total. */
export async function consumeAiRequest(userId: string): Promise<number> {
  const day = usageDayKey();
  const row = await db().aiUsage.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, requests: 1 },
    update: { requests: { increment: 1 } },
  });
  return row.requests;
}

export async function aiRequestsToday(userId: string): Promise<number> {
  const row = await db().aiUsage.findUnique({ where: { userId_day: { userId, day: usageDayKey() } } });
  return row?.requests ?? 0;
}

// ---------------- Billing ----------------

export async function setStripeCustomer(userId: string, stripeCustomerId: string) {
  await db().user.update({ where: { id: userId }, data: { stripeCustomerId } });
}

export async function findUserByStripeCustomer(stripeCustomerId: string) {
  return db().user.findUnique({ where: { stripeCustomerId } });
}

export async function setPlan(userId: string, update: { plan: "free" | "pro"; stripeSubscriptionId: string | null; planRenewsAt: Date | null }) {
  await db().user.update({ where: { id: userId }, data: update });
}

// ---------------- Moving from single-user mode to accounts ----------------

/**
 * The first real account takes over everything the single-user "default-user" created
 * (chats, words, progress, settings), so turning on accounts loses nothing.
 */
export async function claimLegacyUserData(userId: string): Promise<boolean> {
  const prisma = db();
  const legacy = await prisma.user.findUnique({ where: { id: LEGACY_USER_ID } });
  if (!legacy || legacy.id === userId) return false;

  await prisma.$transaction(async (tx) => {
    const move = { where: { userId: LEGACY_USER_ID }, data: { userId } };
    await tx.activitySession.updateMany(move);
    await tx.mistake.updateMany(move);
    await tx.vocabItem.updateMany(move);
    await tx.skillScore.updateMany(move);
    await tx.grammarLesson.updateMany(move);
    await tx.grammarProgress.updateMany(move);
    await tx.customScenario.updateMany(move);
    await tx.learnerMemory.updateMany(move);
    await tx.achievement.updateMany(move);
    await tx.pushSubscription.updateMany(move);
    await tx.aiUsage.updateMany(move);
    const settings = await tx.aiSettings.findUnique({ where: { userId: LEGACY_USER_ID } });
    if (settings) {
      await tx.aiSettings.deleteMany({ where: { userId } });
      await tx.aiSettings.update({ where: { userId: LEGACY_USER_ID }, data: { userId } });
    }
    await tx.user.update({
      where: { id: userId },
      data: {
        cefrLevel: legacy.cefrLevel,
        goals: legacy.goals,
        placementCompleted: legacy.placementCompleted,
        nativeLanguage: legacy.nativeLanguage,
        explainInNative: legacy.explainInNative,
        voiceEnabled: legacy.voiceEnabled,
        memoryEnabled: legacy.memoryEnabled,
        reminderEnabled: legacy.reminderEnabled,
        reminderTime: legacy.reminderTime,
        timeZone: legacy.timeZone,
      },
    });
    await tx.user.delete({ where: { id: LEGACY_USER_ID } });
  });
  return true;
}

/** Runs after Better Auth creates a user: first account claims legacy data and becomes admin; ADMIN_EMAILS become admins. */
export async function onUserCreated(userId: string, email: string | null | undefined, adminEmails: string[]) {
  const prisma = db();
  const accounts = await prisma.user.count({ where: { email: { not: null } } });
  const isFirst = accounts <= 1;
  if (isFirst) await claimLegacyUserData(userId);
  if (isFirst || (email && adminEmails.includes(email.toLowerCase()))) {
    await prisma.user.update({ where: { id: userId }, data: { role: "admin" } });
  }
}

// ---------------- Admin ----------------

export async function adminOverview() {
  const prisma = db();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const weekKey = usageDayKey(weekAgo);

  const [totalUsers, proUsers, newUsers, activeGroups, sessionsByActivity, usageToday, usageWeek, topUsage, topMistakes, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { plan: "pro" } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.activitySession.groupBy({ by: ["userId"], where: { startedAt: { gte: weekAgo } } }),
    prisma.activitySession.groupBy({ by: ["activityId"], where: { startedAt: { gte: weekAgo } }, _count: { _all: true } }),
    prisma.aiUsage.aggregate({ where: { day: usageDayKey(now) }, _sum: { requests: true } }),
    prisma.aiUsage.aggregate({ where: { day: { gte: weekKey } }, _sum: { requests: true } }),
    prisma.aiUsage.groupBy({ by: ["userId"], where: { day: { gte: weekKey } }, _sum: { requests: true }, orderBy: { _sum: { requests: "desc" } }, take: 10 }),
    prisma.mistake.groupBy({ by: ["category"], where: { createdAt: { gte: weekAgo } }, _count: { _all: true }, orderBy: { _count: { category: "desc" } }, take: 8 }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { id: true, email: true, name: true, cefrLevel: true, plan: true, role: true, createdAt: true },
    }),
  ]);

  const ids = [...new Set([...recentUsers.map((u) => u.id), ...topUsage.map((u) => u.userId)])];
  const [lastActive, people] = await Promise.all([
    prisma.activitySession.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _max: { startedAt: true } }),
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, name: true } }),
  ]);
  const lastActiveById = new Map(lastActive.map((l) => [l.userId, l._max.startedAt]));
  const personById = new Map(people.map((p) => [p.id, p]));

  return {
    totals: {
      users: totalUsers,
      proUsers,
      newUsers7d: newUsers,
      activeUsers7d: activeGroups.length,
      aiRequestsToday: usageToday._sum.requests ?? 0,
      aiRequests7d: usageWeek._sum.requests ?? 0,
    },
    sessionsByActivity: sessionsByActivity.map((s) => ({ activityId: s.activityId, count: s._count._all })).sort((a, b) => b.count - a.count),
    topUsage: topUsage.map((u) => ({ user: personById.get(u.userId) ?? { id: u.userId, email: null, name: null }, requests: u._sum.requests ?? 0 })),
    topMistakes: topMistakes.map((m) => ({ category: m.category, count: m._count._all })),
    recentUsers: recentUsers.map((u) => ({ ...u, lastActiveAt: lastActiveById.get(u.id) ?? null })),
  };
}
