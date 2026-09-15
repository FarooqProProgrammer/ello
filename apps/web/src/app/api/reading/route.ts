import { READING_LENGTHS, READING_THEMES, readingRequest, readingSchema, sanitizeExercises } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { translationLanguage } from "@repo/core";
import { createSession, getLearnerContext } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse, HttpError, parseBody } from "@/lib/api";

const bodySchema = z.object({
  theme: z.string().max(60).refine((t) => READING_THEMES.includes(t) || t.trim().length >= 3, "Pick a theme"),
  length: z.enum(Object.keys(READING_LENGTHS) as [keyof typeof READING_LENGTHS]),
});

/** Creates an AI reading text with glossary and comprehension questions. */
export async function POST(req: Request) {
  try {
    const { theme, length } = await parseBody(req, bodySchema);
    const user = await getCurrentUser();
    const [ctx, env] = await Promise.all([getLearnerContext(user.id), aiEnvFor(user.id)]);
    const content = await getProvider("generator", env).structured(
      readingRequest(ctx, theme, length, translationLanguage(user.nativeLanguage).name),
      readingSchema,
      "reading",
    );
    const exercises = sanitizeExercises(content.exercises);
    if (!content.text.trim() || exercises.length < 2) throw new HttpError(502, "The AI couldn't create a complete reading. Try again.", "bad_model_output");

    const session = await createSession(user.id, "reading", content.title, {
      topicId: theme,
      data: { title: content.title, text: content.text, glossary: content.glossary, length, exercises, answers: {} },
    });
    return NextResponse.json({ id: session.id });
  } catch (err) {
    return errorResponse(err);
  }
}
