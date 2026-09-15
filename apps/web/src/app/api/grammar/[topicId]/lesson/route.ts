import { grammarLessonRequest, grammarLessonSchema } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { findGrammarTopic } from "@repo/core";
import { getGrammarLesson, getLearnerContext, saveGrammarLesson } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse, HttpError, parseBody } from "@/lib/api";

const bodySchema = z.object({ regenerate: z.boolean().default(false) });

/** Returns the learner's cached lesson for a topic, or writes one with the AI. */
export async function POST(req: Request, { params }: { params: Promise<{ topicId: string }> }) {
  try {
    const { topicId } = await params;
    const topic = findGrammarTopic(topicId);
    if (!topic) throw new HttpError(404, "Grammar topic not found.");
    const { regenerate } = await parseBody(req, bodySchema);
    const user = await getCurrentUser();

    if (!regenerate) {
      const cached = await getGrammarLesson(user.id, topic.id, user.cefrLevel);
      if (cached) return NextResponse.json({ lesson: cached });
    }

    const [ctx, env] = await Promise.all([getLearnerContext(user.id), aiEnvFor(user.id)]);
    const lesson = await getProvider("generator", env).structured(grammarLessonRequest(ctx, topic), grammarLessonSchema, "grammar_lesson");
    await saveGrammarLesson(user.id, topic.id, user.cefrLevel, lesson);
    return NextResponse.json({ lesson });
  } catch (err) {
    return errorResponse(err);
  }
}
