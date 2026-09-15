import { buildVocabQuiz } from "@repo/activities";
import { createSession, listVocab } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, HttpError, parseBody } from "@/lib/api";
import { practicePayload } from "@/lib/practice";

const bodySchema = z.object({ mode: z.enum(["due", "recent", "all"]).default("due") });
const POOL = 20;

/** A 10-question quiz from the learner's own dictionary. */
export async function POST(req: Request) {
  try {
    const { mode } = await parseBody(req, bodySchema);
    const user = await getCurrentUser();
    const vocab = await listVocab(user.id); // newest first
    const now = Date.now();

    const ordered =
      mode === "due"
        ? [...vocab].sort((a, b) => Number(b.due.getTime() <= now) - Number(a.due.getTime() <= now) || a.due.getTime() - b.due.getTime())
        : vocab;
    // Always draw distractors from the whole dictionary, but quiz the chosen words.
    const chosen = mode === "all" ? vocab : ordered.slice(0, POOL);
    const pool = chosen.length >= 4 ? chosen : vocab;

    const exercises = buildVocabQuiz(
      pool.map((v) => ({ term: v.term, definition: v.definition, translation: v.translation, example: v.example })),
      { count: 10 },
    );
    if (!exercises.length) throw new HttpError(400, "Add at least 4 words to your dictionary to take a quiz.");

    const session = await createSession(user.id, "vocab-quiz", `Vocabulary quiz (${mode})`, { data: { mode, exercises, answers: {} } });
    return NextResponse.json(practicePayload(session));
  } catch (err) {
    return errorResponse(err);
  }
}
