import { pronunciationTipsRequest, pronunciationTipsSchema } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { compareWords, translationLanguage } from "@repo/core";
import { createSession, getLearnerContext, recordActivityResult } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse, parseBody } from "@/lib/api";

const bodySchema = z.object({ target: z.string().trim().min(2).max(300), heard: z.string().max(600) });

/** Scores one pronunciation attempt (recognised words), saves a Speaking score, and adds AI tips for missed words. */
export async function POST(req: Request) {
  try {
    const { target, heard } = await parseBody(req, bodySchema);
    const user = await getCurrentUser();
    const { words, score } = compareWords(target, heard);
    const missed = words.filter((w) => !w.ok).map((w) => w.word.replace(/[^\p{L}\p{N}']/gu, ""));

    const session = await createSession(user.id, "pronunciation", target.slice(0, 60));
    await recordActivityResult({
      userId: user.id,
      sessionId: session.id,
      result: { score, skill: "SPEAKING", mistakes: [], newVocab: [] },
      endSession: true,
    });

    let tips: { tips: { word: string; tip: string }[]; summary: string; summaryNative: string } | null = null;
    if (missed.length) {
      try {
        const [ctx, env] = await Promise.all([getLearnerContext(user.id), aiEnvFor(user.id)]);
        tips = await getProvider("grader", env).structured(
          pronunciationTipsRequest(ctx, target, heard, missed, translationLanguage(user.nativeLanguage).name),
          pronunciationTipsSchema,
          "pronunciation_tips",
        );
      } catch {
        tips = null; // the score is still useful without tips
      }
    }
    return NextResponse.json({ words, score, tips });
  } catch (err) {
    return errorResponse(err);
  }
}
