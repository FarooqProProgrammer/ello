import { adjustLevel, type ActivityResult } from "@repo/core";
import { db } from "./client";

export async function createSession(
  userId: string,
  activityId: string,
  title?: string,
  extra: { topicId?: string | null; focus?: string | null; data?: Record<string, unknown> } = {},
) {
  return db().activitySession.create({
    data: {
      userId,
      activityId,
      title: title ?? null,
      topicId: extra.topicId ?? null,
      focus: extra.focus ?? null,
      ...(extra.data ? { data: extra.data as object } : {}),
    },
  });
}

export async function getSession(userId: string, sessionId: string) {
  return db().activitySession.findFirst({
    where: { id: sessionId, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" }, include: { mistakes: true } },
    },
  });
}

export async function listSessions(userId: string, activityId: string, limit = 20) {
  return db().activitySession.findMany({
    where: { userId, activityId },
    orderBy: { startedAt: "desc" },
    take: limit,
    select: { id: true, title: true, startedAt: true, score: true, _count: { select: { messages: true } } },
  });
}

/** Tutor chats for the history list, most recently active first. Empty chats are skipped. */
export async function listTutorChats(userId: string, limit = 100) {
  const chats = await db().activitySession.findMany({
    where: { userId, activityId: "tutor-chat", messages: { some: { role: "USER" } } },
    orderBy: { lastMessageAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      topicId: true,
      focus: true,
      lastMessageAt: true,
      data: true,
      _count: { select: { messages: true } },
      messages: { where: { role: "USER" }, orderBy: { createdAt: "desc" }, take: 1, select: { content: true } },
    },
  });
  return chats.map((c) => ({
    id: c.id,
    title: c.title,
    topicId: c.topicId,
    focus: c.focus,
    scenarioTitle: (c.data as { scenario?: { title?: string } } | null)?.scenario?.title ?? null,
    lastMessageAt: c.lastMessageAt,
    messageCount: c._count.messages,
    preview: c.messages[0]?.content ?? "",
  }));
}

export type TutorChatSummary = Awaited<ReturnType<typeof listTutorChats>>[number];

/** Sessions of one activity including their stored data (e.g. writing submissions). */
export async function listSessionsWithData(userId: string, activityId: string, limit = 30) {
  return db().activitySession.findMany({
    where: { userId, activityId },
    orderBy: { startedAt: "desc" },
    take: limit,
    select: { id: true, title: true, topicId: true, startedAt: true, score: true, data: true },
  });
}

export async function getActivitySession(userId: string, sessionId: string, activityId: string) {
  return db().activitySession.findFirst({ where: { id: sessionId, userId, activityId } });
}

/** Sessions keyed by title, e.g. a weekly report for "2026-W38". */
export async function findSessionByTitle(userId: string, activityId: string, title: string) {
  return db().activitySession.findFirst({ where: { userId, activityId, title }, orderBy: { startedAt: "desc" } });
}

export async function saveMessageExplanation(messageId: string, explanation: Record<string, unknown>) {
  await db().message.update({ where: { id: messageId }, data: { explanation: explanation as object } });
}

export async function renameSession(userId: string, sessionId: string, title: string) {
  const { count } = await db().activitySession.updateMany({ where: { id: sessionId, userId }, data: { title } });
  return count > 0;
}

export async function deleteSession(userId: string, sessionId: string) {
  const { count } = await db().activitySession.deleteMany({ where: { id: sessionId, userId } });
  return count > 0;
}

export async function addMessage(sessionId: string, role: "USER" | "ASSISTANT", content: string) {
  const [message] = await db().$transaction([
    db().message.create({ data: { sessionId, role, content } }),
    db().activitySession.update({ where: { id: sessionId }, data: { lastMessageAt: new Date() } }),
  ]);
  return message;
}

/** Stores the grading result on the learner's message so reopened chats show the same feedback. */
export async function saveMessageAnalysis(messageId: string, analysis: Record<string, unknown>) {
  await db().message.update({ where: { id: messageId }, data: { analysis: analysis as object } });
}

export async function saveMessageTranslation(messageId: string, translation: string) {
  await db().message.update({ where: { id: messageId }, data: { translation } });
}

/** Gives a chat a title from the learner's first message (ChatGPT-style), unless already renamed. */
export async function ensureChatTitle(sessionId: string, firstMessage: string, defaultTitle: string | null) {
  const session = await db().activitySession.findUnique({ where: { id: sessionId }, select: { title: true } });
  if (!session || (session.title && session.title !== defaultTitle)) return;
  const words = firstMessage.replace(/\s+/g, " ").trim().split(" ");
  const title = words.slice(0, 7).join(" ") + (words.length > 7 ? "…" : "");
  if (title) await db().activitySession.update({ where: { id: sessionId }, data: { title } });
}

export interface RecordResultOptions {
  userId: string;
  sessionId: string;
  result: ActivityResult;
  /** Attach mistakes to the message they were found in. */
  messageId?: string;
  vocabSource?: string;
  /** Close the session and adjust the learner's level. */
  endSession?: boolean;
}

/** Persists an ActivityResult: mistakes, auto-created flashcards, skill score, level adjustment. */
export async function recordActivityResult({
  userId,
  sessionId,
  result,
  messageId,
  vocabSource = "tutor-chat",
  endSession = false,
}: RecordResultOptions) {
  const prisma = db();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  await prisma.$transaction(async (tx) => {
    if (result.mistakes.length > 0) {
      await tx.mistake.createMany({
        data: result.mistakes.map((m) => ({ ...m, userId, sessionId, messageId: messageId ?? null })),
      });
    }
    for (const word of result.newVocab) {
      const term = word.term.trim().toLowerCase();
      if (!term) continue;
      await tx.vocabItem.upsert({
        where: { userId_term: { userId, term } },
        update: {},
        create: { userId, term, definition: word.definition, example: word.example ?? null, source: vocabSource },
      });
    }
    if (result.score !== null && result.skill) {
      await tx.skillScore.create({
        data: { userId, skill: result.skill, score: result.score, cefr: user.cefrLevel },
      });
    }
    if (endSession) {
      await tx.activitySession.update({
        where: { id: sessionId },
        data: { endedAt: new Date(), score: result.score },
      });
    }
  });

  if (!endSession) return { levelChange: null };

  const recent = await prisma.activitySession.findMany({
    where: { userId, score: { not: null }, endedAt: { not: null }, activityId: { not: "placement" } },
    orderBy: { endedAt: "desc" },
    take: 5,
    select: { score: true },
  });
  const decision = adjustLevel(
    user.cefrLevel,
    recent.map((s) => s.score!).reverse(),
  );
  if (decision.changed) {
    await prisma.user.update({ where: { id: userId }, data: { cefrLevel: decision.level } });
  }
  return { levelChange: decision.changed ? decision : null };
}
