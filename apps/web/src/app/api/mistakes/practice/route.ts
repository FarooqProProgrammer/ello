import { dailyReviewRequest, exerciseSetSchema, sanitizeExercises } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { GRAMMAR_TOPICS } from "@repo/core";
import { createSession, getLearnerContext, mistakesForCategory } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse, HttpError, parseBody } from "@/lib/api";
import { practicePayload } from "@/lib/practice";

const bodySchema = z.object({ category: z.string().min(1).max(80) });

/** AI practice made from the learner's own mistakes in one category. */
export async function POST(req: Request) {
  try {
    const { category } = await parseBody(req, bodySchema);
    const user = await getCurrentUser();
    const mistakes = await mistakesForCategory(user.id, category);
    if (!mistakes.length) throw new HttpError(404, "No open mistakes in this category.");

    const [ctx, env] = await Promise.all([getLearnerContext(user.id), aiEnvFor(user.id)]);
    const topic = GRAMMAR_TOPICS.find((t) => t.categories.includes(category)) ?? null;
    const provider = getProvider("generator", env);
    const generate = async () => sanitizeExercises((await provider.structured(dailyReviewRequest(ctx, mistakes, topic, 8), exerciseSetSchema, "mistake_practice")).exercises);
    let exercises = await generate();
    if (exercises.length < 4) exercises = await generate();
    if (exercises.length < 4) throw new HttpError(502, "The AI couldn't create valid questions. Try again.", "bad_model_output");

    const session = await createSession(user.id, "mistakes", category, { topicId: topic?.id ?? null, data: { category, exercises, answers: {} } });
    return NextResponse.json(practicePayload(session));
  } catch (err) {
    return errorResponse(err);
  }
}
