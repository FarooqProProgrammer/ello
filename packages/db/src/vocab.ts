import { reviewCard, type ReviewRating, type SrsCardState } from "@repo/core";
import { db } from "./client";

export async function getDueVocab(userId: string, limit = 20, now = new Date()) {
  return db().vocabItem.findMany({
    where: { userId, due: { lte: now } },
    orderBy: [{ state: "asc" }, { due: "asc" }],
    take: limit,
  });
}

export async function countDueVocab(userId: string, now = new Date()) {
  return db().vocabItem.count({ where: { userId, due: { lte: now } } });
}

export async function getVocabItem(userId: string, term: string) {
  return db().vocabItem.findUnique({ where: { userId_term: { userId, term: term.trim().toLowerCase() } } });
}

export async function deleteVocab(userId: string, id: string) {
  const { count } = await db().vocabItem.deleteMany({ where: { id, userId } });
  return count > 0;
}

export async function listVocab(userId: string) {
  return db().vocabItem.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function addVocab(userId: string, input: { term: string; definition: string; example?: string }) {
  const term = input.term.trim().toLowerCase();
  return db().vocabItem.upsert({
    where: { userId_term: { userId, term } },
    update: { definition: input.definition, example: input.example ?? null },
    create: { userId, term, definition: input.definition, example: input.example ?? null, source: "manual" },
  });
}

export interface EnrichedVocabInput {
  term: string;
  definition: string;
  example: string;
  partOfSpeech: string;
  translation: string;
  usageNote: string;
  usageNative: string;
}

/** Saves an AI dictionary entry; re-adding a word refreshes its details but keeps its review schedule. */
export async function saveEnrichedVocab(userId: string, input: EnrichedVocabInput, source = "selection") {
  const term = input.term.trim().toLowerCase();
  const existing = await db().vocabItem.findUnique({ where: { userId_term: { userId, term } }, select: { id: true } });
  const details = {
    definition: input.definition,
    example: input.example || null,
    partOfSpeech: input.partOfSpeech || null,
    translation: input.translation || null,
    usageNote: input.usageNote || null,
    usageNative: input.usageNative || null,
  };
  const item = await db().vocabItem.upsert({
    where: { userId_term: { userId, term } },
    update: details,
    create: { userId, term, source, ...details },
  });
  return { item, alreadyExisted: Boolean(existing) };
}

export async function applyReview(userId: string, vocabId: string, rating: ReviewRating, now = new Date()) {
  const item = await db().vocabItem.findFirstOrThrow({ where: { id: vocabId, userId } });
  const current: SrsCardState = {
    due: item.due,
    stability: item.stability,
    difficulty: item.difficulty,
    scheduledDays: item.scheduledDays,
    learningSteps: item.learningSteps,
    reps: item.reps,
    lapses: item.lapses,
    state: item.state,
    lastReview: item.lastReview,
  };
  const next = reviewCard(current, rating, now);
  return db().vocabItem.update({ where: { id: item.id }, data: next });
}
