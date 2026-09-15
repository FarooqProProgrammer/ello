import { answerCheckRequest, answerCheckSchema, quickCheck } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { findGrammarTopic } from "@repo/core";
import { getLearnerContext, getPracticeSession, updateSessionData } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse, HttpError, parseBody } from "@/lib/api";
import type { PracticeData, StoredAnswer } from "@/lib/practice";

const bodySchema = z.object({ exerciseId: z.string(), answer: z.string().max(500) });

/** Checks one answer for any practice activity: exact match first, AI judgement for differently-phrased free text. */
export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    const { exerciseId, answer } = await parseBody(req, bodySchema);
    const user = await getCurrentUser();
    const session = await getPracticeSession(user.id, sessionId);
    if (!session?.data || session.endedAt) throw new HttpError(404, "Practice session not found or already finished.");

    const data = session.data as unknown as PracticeData;
    const exercise = data.exercises.find((e) => e.id === exerciseId);
    if (!exercise) throw new HttpError(404, "Exercise not found.");
    const existing = data.answers[exerciseId];
    if (existing) return NextResponse.json(existing);

    let correct = quickCheck(exercise, answer);
    let feedback = "";
    if (correct === null) {
      // Grammar practice has a topic; other activities mix topics.
      const topic = session.activityId === "grammar" ? (findGrammarTopic(session.topicId ?? "") ?? null) : null;
      const [ctx, env] = await Promise.all([getLearnerContext(user.id), aiEnvFor(user.id)]);
      const verdict = await getProvider("grader", env).structured(answerCheckRequest(ctx, topic, exercise, answer), answerCheckSchema, "answer_check");
      correct = verdict.correct;
      feedback = verdict.feedback;
    }

    const stored: StoredAnswer = {
      given: answer,
      correct,
      feedback: feedback || (correct ? "Correct!" : "Not quite."),
      correctAnswer: exercise.answer,
      explanation: exercise.explanation,
    };
    await updateSessionData(sessionId, { ...data, answers: { ...data.answers, [exerciseId]: stored } });
    return NextResponse.json(stored);
  } catch (err) {
    return errorResponse(err);
  }
}
