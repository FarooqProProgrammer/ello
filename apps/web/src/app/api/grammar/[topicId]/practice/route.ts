import { exerciseSetSchema, grammarExercisesRequest, publicExercise, sanitizeExercises } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { findGrammarTopic } from "@repo/core";
import { createPracticeSession, getLearnerContext } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse, HttpError } from "@/lib/api";

const MIN_EXERCISES = 4;

/** Generates a fresh AI exercise set; answers stay on the server. */
export async function POST(_req: Request, { params }: { params: Promise<{ topicId: string }> }) {
  try {
    const { topicId } = await params;
    const topic = findGrammarTopic(topicId);
    if (!topic) throw new HttpError(404, "Grammar topic not found.");
    const user = await getCurrentUser();
    const [ctx, env] = await Promise.all([getLearnerContext(user.id), aiEnvFor(user.id)]);

    const provider = getProvider("generator", env);
    let exercises = sanitizeExercises((await provider.structured(grammarExercisesRequest(ctx, topic), exerciseSetSchema, "grammar_exercises")).exercises);
    if (exercises.length < MIN_EXERCISES) {
      // One more try — smaller models sometimes produce malformed items.
      exercises = sanitizeExercises((await provider.structured(grammarExercisesRequest(ctx, topic), exerciseSetSchema, "grammar_exercises")).exercises);
    }
    if (exercises.length < MIN_EXERCISES) {
      throw new HttpError(502, "The AI couldn't create valid exercises. Try again or choose a stronger model in Settings.", "bad_model_output");
    }

    const session = await createPracticeSession(user.id, topic.id, topic.title, { exercises, answers: {} });
    return NextResponse.json({ sessionId: session.id, exercises: exercises.map(publicExercise) });
  } catch (err) {
    return errorResponse(err);
  }
}
