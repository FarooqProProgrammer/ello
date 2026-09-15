import { isDuplicateFact, normalizeFact } from "@repo/core";
import { db } from "./client";

const MAX_MEMORIES = 200;
/** How many recent facts are given to the AI in prompts. */
export const MEMORIES_IN_PROMPT = 25;

export async function listMemories(userId: string, limit?: number) {
  return db().learnerMemory.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    ...(limit ? { take: limit } : {}),
    select: { id: true, fact: true, source: true, updatedAt: true },
  });
}

/** Adds facts that aren't already remembered; trims the oldest beyond the cap. Returns what was saved. */
export async function addMemories(
  userId: string,
  facts: string[],
  source: "chat" | "manual",
  ref: { sessionId?: string; messageId?: string } = {},
) {
  const existing = (await listMemories(userId)).map((m) => m.fact);
  const saved: { id: string; fact: string }[] = [];
  for (const raw of facts) {
    const fact = normalizeFact(raw);
    if (!fact || isDuplicateFact([...existing, ...saved.map((s) => s.fact)], fact)) continue;
    const row = await db().learnerMemory.create({
      data: { userId, fact, source, sessionId: ref.sessionId ?? null, messageId: ref.messageId ?? null },
      select: { id: true, fact: true },
    });
    saved.push(row);
  }
  if (saved.length) {
    const overflow = await db().learnerMemory.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, skip: MAX_MEMORIES, select: { id: true } });
    if (overflow.length) await db().learnerMemory.deleteMany({ where: { id: { in: overflow.map((o) => o.id) } } });
  }
  return saved;
}

/** Facts learned from specific messages, grouped by message id (for the "Remembered" chip). */
export async function memoriesByMessage(userId: string, where: { messageId?: string; sessionId?: string }) {
  const rows = await db().learnerMemory.findMany({
    where: { userId, ...(where.messageId ? { messageId: where.messageId } : {}), ...(where.sessionId ? { sessionId: where.sessionId } : {}), NOT: { messageId: null } },
    orderBy: { createdAt: "asc" },
    select: { messageId: true, fact: true },
  });
  const map = new Map<string, string[]>();
  for (const r of rows) map.set(r.messageId!, [...(map.get(r.messageId!) ?? []), r.fact]);
  return map;
}

export async function updateMemory(userId: string, id: string, fact: string) {
  const { count } = await db().learnerMemory.updateMany({ where: { id, userId }, data: { fact: normalizeFact(fact) } });
  return count > 0;
}

export async function deleteMemory(userId: string, id: string) {
  const { count } = await db().learnerMemory.deleteMany({ where: { id, userId } });
  return count > 0;
}

export async function clearMemories(userId: string) {
  const { count } = await db().learnerMemory.deleteMany({ where: { userId } });
  return count;
}
