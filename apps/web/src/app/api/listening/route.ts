import { listeningRequest, listeningSchema, READING_THEMES, sanitizeExercises } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { createSession, getLearnerContext } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse, HttpError, parseBody } from "@/lib/api";

const bodySchema = z.object({ theme: z.string().max(60).refine((t) => READING_THEMES.includes(t) || t.trim().length >= 3, "Pick a theme") });

/** Creates an AI listening dialogue with questions and dictation sentences. */
export async function POST(req: Request) {
  try {
    const { theme } = await parseBody(req, bodySchema);
    const user = await getCurrentUser();
    const [ctx, env] = await Promise.all([getLearnerContext(user.id), aiEnvFor(user.id)]);
    const content = await getProvider("generator", env).structured(listeningRequest(ctx, theme), listeningSchema, "listening");

    const exercises = sanitizeExercises(content.exercises);
    const lines = content.lines.filter((l) => l.text.trim());
    const script = lines.map((l) => l.text).join(" ");
    const dictation = content.dictation.map((s) => s.trim()).filter((s) => s && script.includes(s.slice(0, 12))).slice(0, 3);
    if (lines.length < 4 || exercises.length < 2) throw new HttpError(502, "The AI couldn't create a complete listening task. Try again.", "bad_model_output");

    const session = await createSession(user.id, "listening", content.title, {
      topicId: theme,
      data: { title: content.title, situation: content.situation, lines, dictation, exercises, answers: {} },
    });
    return NextResponse.json({ id: session.id });
  } catch (err) {
    return errorResponse(err);
  }
}
