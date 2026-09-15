import type { CefrLevel, Goal, LearnerContext, MistakeType } from "@repo/core";
import { db } from "./client";

const DEFAULT_USER_ID = "default-user";

/** Single-user mode: every request acts as this user until auth is added. */
export async function getCurrentUser() {
  return db().user.upsert({
    where: { id: DEFAULT_USER_ID },
    update: {},
    create: { id: DEFAULT_USER_ID, name: "Learner" },
  });
}

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

export async function getUserById(userId: string) {
  return db().user.findUnique({ where: { id: userId } });
}

export async function listUserIds() {
  return (await db().user.findMany({ select: { id: true } })).map((u) => u.id);
}

export interface ProfileUpdate {
  name?: string | null;
  nativeLanguage?: string | null;
  explainInNative?: boolean;
  cefrLevel?: CefrLevel;
  goals?: Goal[];
  placementCompleted?: boolean;
  voiceEnabled?: boolean;
  memoryEnabled?: boolean;
  reminderEnabled?: boolean;
  reminderTime?: string;
  timeZone?: string;
}

export async function updateProfile(userId: string, update: ProfileUpdate) {
  return db().user.update({ where: { id: userId }, data: update });
}

export async function getWeakAreas(userId: string, { days = 30, limit = 5 } = {}) {
  const since = new Date(Date.now() - days * 86_400_000);
  const groups = await db().mistake.groupBy({
    by: ["category", "type"],
    where: { userId, createdAt: { gte: since }, resolvedAt: null },
    _count: { _all: true },
    orderBy: { _count: { category: "desc" } },
    take: limit,
  });
  return groups.map((g) => ({ category: g.category, type: g.type as MistakeType, count: g._count._all }));
}

export async function getLearnerContext(userId: string): Promise<LearnerContext> {
  const user = await db().user.findUniqueOrThrow({ where: { id: userId } });
  const [weakAreas, recent, memories] = await Promise.all([
    getWeakAreas(userId),
    db().mistake.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { type: true, category: true, original: true, corrected: true },
    }),
    user.memoryEnabled
      ? db().learnerMemory.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 25, select: { fact: true } })
      : Promise.resolve([]),
  ]);
  return {
    userId: user.id,
    name: user.name,
    level: user.cefrLevel,
    goals: user.goals,
    nativeLanguage: user.explainInNative ? user.nativeLanguage : null,
    weakAreas,
    recentMistakes: recent.map((m) => ({ ...m, type: m.type as MistakeType })),
    memories: memories.map((m) => m.fact),
  };
}
