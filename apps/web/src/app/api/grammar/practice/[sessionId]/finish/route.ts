import { grammarPracticeResult } from "@repo/activities";
import { findGrammarTopic, type ActivityResult } from "@repo/core";
import { getPracticeSession, recordActivityResult, recordGrammarPractice } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { errorResponse, HttpError } from "@/lib/api";
import { PRACTICE_SKILL, type PracticeData } from "@/lib/practice";

/** Closes any practice session: skill score, mistakes (grammar), topic mastery (grammar), level check. */
export async function POST(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    const user = await getCurrentUser();
    const session = await getPracticeSession(user.id, sessionId);
    if (!session?.data) throw new HttpError(404, "Practice session not found.");

    const data = session.data as unknown as PracticeData;
    const answers = Object.entries(data.answers).map(([exerciseId, a]) => ({ exerciseId, given: a.given, correct: a.correct }));
    if (answers.length === 0) throw new HttpError(400, "Answer at least one question first.");
    const correct = answers.filter((a) => a.correct).length;

    if (session.endedAt) {
      return NextResponse.json({ score: session.score, correct, total: answers.length, mastery: null, levelChange: null });
    }

    const topic = session.activityId === "grammar" ? findGrammarTopic(session.topicId ?? "") : undefined;
    // Only single-topic grammar practice files wrong answers under a grammar category.
    const result: ActivityResult = topic
      ? grammarPracticeResult(topic, data.exercises, answers)
      : { score: Math.round((correct / answers.length) * 100), skill: PRACTICE_SKILL[session.activityId] ?? "GRAMMAR", mistakes: [], newVocab: [] };

    const { levelChange } = await recordActivityResult({ userId: user.id, sessionId, result, endSession: true });
    const mastery = topic ? await recordGrammarPractice(user.id, topic.id, result.score ?? 0) : null;

    return NextResponse.json({ score: result.score, correct, total: answers.length, mastery, levelChange });
  } catch (err) {
    return errorResponse(err);
  }
}
