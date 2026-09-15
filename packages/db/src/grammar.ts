import { nextMastery, type CefrLevel, type TopicProgress } from "@repo/core";
import { db } from "./client";

export async function getGrammarLesson(userId: string, topicId: string, level: CefrLevel) {
  const row = await db().grammarLesson.findUnique({ where: { userId_topicId_level: { userId, topicId, level } } });
  return row?.content ?? null;
}

export async function saveGrammarLesson(userId: string, topicId: string, level: CefrLevel, content: Record<string, unknown>) {
  await db().grammarLesson.upsert({
    where: { userId_topicId_level: { userId, topicId, level } },
    update: { content: content as object, createdAt: new Date() },
    create: { userId, topicId, level, content: content as object },
  });
}

export async function getGrammarProgress(userId: string): Promise<Record<string, TopicProgress & { lastPracticedAt: Date }>> {
  const rows = await db().grammarProgress.findMany({ where: { userId } });
  return Object.fromEntries(rows.map((r) => [r.topicId, { mastery: r.mastery, attempts: r.attempts, lastPracticedAt: r.lastPracticedAt }]));
}

/** Updates a topic's mastery after a practice session; returns the new mastery. */
export async function recordGrammarPractice(userId: string, topicId: string, score: number): Promise<number> {
  const previous = await db().grammarProgress.findUnique({ where: { userId_topicId: { userId, topicId } } });
  const mastery = nextMastery(previous ?? undefined, score);
  await db().grammarProgress.upsert({
    where: { userId_topicId: { userId, topicId } },
    update: { mastery, attempts: { increment: 1 }, lastPracticedAt: new Date() },
    create: { userId, topicId, mastery, attempts: 1 },
  });
  return mastery;
}

export async function createPracticeSession(userId: string, topicId: string, title: string, data: Record<string, unknown>) {
  return db().activitySession.create({
    data: { userId, activityId: "grammar", topicId, title, data: data as object },
  });
}

export async function getPracticeSession(userId: string, sessionId: string) {
  return db().activitySession.findFirst({ where: { id: sessionId, userId, activityId: { in: [...PRACTICE_ACTIVITIES] } } });
}

/** Activities that run an exercise set through the shared practice endpoints. */
export const PRACTICE_ACTIVITIES = ["grammar", "daily", "reading", "listening", "mistakes", "idioms", "vocab-quiz"] as const;

/** Today's daily review session (title = local date key), if it has been prepared. */
export async function findDailySession(userId: string, dateKey: string) {
  return db().activitySession.findFirst({ where: { userId, activityId: "daily", title: dateKey }, orderBy: { startedAt: "asc" } });
}

export async function updateSessionData(sessionId: string, data: Record<string, unknown>) {
  await db().activitySession.update({ where: { id: sessionId }, data: { data: data as object } });
}
