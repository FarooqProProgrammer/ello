import { IDIOM_KINDS, IDIOM_THEMES, idiomPackRequest, idiomPackSchema, sanitizeExercises } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { translationLanguage } from "@repo/core";
import { createSession, getLearnerContext, listVocab } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse, HttpError, parseBody } from "@/lib/api";

const bodySchema = z.object({
  theme: z.string().refine((t) => IDIOM_THEMES.includes(t), "Pick a theme"),
  kind: z.enum(Object.keys(IDIOM_KINDS) as [keyof typeof IDIOM_KINDS]),
});

/** Creates a themed idioms / phrasal verbs pack with a quiz. */
export async function POST(req: Request) {
  try {
    const { theme, kind } = await parseBody(req, bodySchema);
    const user = await getCurrentUser();
    const [ctx, env, vocab] = await Promise.all([getLearnerContext(user.id), aiEnvFor(user.id), listVocab(user.id)]);
    const pack = await getProvider("generator", env).structured(
      idiomPackRequest(ctx, theme, kind, vocab.map((v) => v.term), translationLanguage(user.nativeLanguage).name),
      idiomPackSchema,
      "idiom_pack",
    );
    const items = pack.items.filter((i) => i.term.trim() && i.meaning.trim()).slice(0, 10);
    const exercises = sanitizeExercises(pack.exercises);
    if (items.length < 4 || exercises.length < 3) throw new HttpError(502, "The AI couldn't create a complete pack. Try again.", "bad_model_output");

    const session = await createSession(user.id, "idioms", `${theme} · ${IDIOM_KINDS[kind]}`, {
      topicId: theme,
      data: { theme, kind, items, exercises, answers: {} },
    });
    return NextResponse.json({ id: session.id });
  } catch (err) {
    return errorResponse(err);
  }
}
