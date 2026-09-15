import { ieltsQuestionsRequest, ieltsQuestionsSchema } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { createSession, getLearnerContext } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse, HttpError } from "@/lib/api";

/** Starts an IELTS speaking mock test with AI examiner questions. */
export async function POST() {
  try {
    const user = await getCurrentUser();
    const [ctx, env] = await Promise.all([getLearnerContext(user.id), aiEnvFor(user.id)]);
    const questions = await getProvider("generator", env).structured(ieltsQuestionsRequest(ctx), ieltsQuestionsSchema, "ielts_questions");
    if (!questions.part1.length || !questions.part2.topic || !questions.part3.length) {
      throw new HttpError(502, "The AI couldn't create a complete test. Try again.", "bad_model_output");
    }
    const session = await createSession(user.id, "ielts-speaking", questions.part2.topic, { data: { questions } });
    return NextResponse.json({ id: session.id, questions });
  } catch (err) {
    return errorResponse(err);
  }
}
