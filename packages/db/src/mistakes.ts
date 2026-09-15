import type { RecentMistake } from "@repo/core";
import { db } from "./client";

export async function listMistakes(userId: string, { limit = 400, includeResolved = false } = {}) {
  return db().mistake.findMany({
    where: { userId, ...(includeResolved ? {} : { resolvedAt: null }) },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      category: true,
      original: true,
      corrected: true,
      explanation: true,
      createdAt: true,
      session: { select: { id: true, activityId: true, title: true } },
    },
  });
}

export async function mistakesForCategory(userId: string, category: string, limit = 10): Promise<RecentMistake[]> {
  const rows = await db().mistake.findMany({
    where: { userId, category, resolvedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { type: true, category: true, original: true, corrected: true },
  });
  return rows;
}

/** "Mark as learned": one mistake, or every open mistake in a category. */
export async function resolveMistakes(userId: string, target: { id?: string; category?: string }) {
  const { count } = await db().mistake.updateMany({
    where: { userId, resolvedAt: null, ...(target.id ? { id: target.id } : {}), ...(target.category ? { category: target.category } : {}) },
    data: { resolvedAt: new Date() },
  });
  return count;
}
