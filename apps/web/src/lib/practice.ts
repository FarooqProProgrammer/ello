import { publicExercise, type PracticeExercise } from "@repo/activities";
import type { Skill } from "@repo/core";

export interface StoredAnswer {
  given: string;
  correct: boolean;
  feedback: string;
  correctAnswer: string;
  explanation: string;
}

/** Exercise-set state stored in ActivitySession.data for every practice activity. */
export interface PracticeData {
  exercises: PracticeExercise[];
  answers: Record<string, StoredAnswer>;
}

export const PRACTICE_SKILL: Record<string, Skill> = {
  grammar: "GRAMMAR",
  daily: "GRAMMAR",
  mistakes: "GRAMMAR",
  reading: "READING",
  listening: "LISTENING",
  idioms: "VOCAB",
  "vocab-quiz": "VOCAB",
};

/** What the browser needs to run or resume a practice session (answers stay on the server until checked). */
export function practicePayload(session: { id: string; data: unknown; endedAt: Date | null; score: number | null }) {
  const data = session.data as PracticeData;
  return {
    sessionId: session.id,
    exercises: data.exercises.map(publicExercise),
    answered: data.answers,
    finished: Boolean(session.endedAt),
    score: session.score,
  };
}
