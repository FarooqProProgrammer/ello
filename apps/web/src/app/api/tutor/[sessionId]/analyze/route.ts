import { locatableCorrections, runActivity, tutorChatActivity } from "@repo/activities";
import { getLearnerContext, getSession, recordActivityResult, saveMessageAnalysis } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { emit, EVENTS } from "@repo/jobs";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse, HttpError, parseBody } from "@/lib/api";

const bodySchema = z.object({ messageId: z.string() });

/** Grades one learner message: corrections, better version, new words. Persists mistakes + flashcards. */
export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    const { messageId } = await parseBody(req, bodySchema);
    const user = await getCurrentUser();
    const session = await getSession(user.id, sessionId);
    if (!session) throw new HttpError(404, "Chat not found.");

    const index = session.messages.findIndex((m) => m.id === messageId && m.role === "USER");
    if (index === -1) throw new HttpError(404, "Message not found.");
    const message = session.messages[index]!;
    // Already graded: return the stored feedback instead of recording mistakes twice.
    if (message.analysis) return NextResponse.json(message.analysis);
    const previousTutor = session.messages
      .slice(0, index)
      .reverse()
      .find((m) => m.role === "ASSISTANT");

    const [ctx, env] = await Promise.all([getLearnerContext(user.id), aiEnvFor(user.id)]);
    const { output, result } = await runActivity(
      tutorChatActivity,
      ctx,
      { learnerMessage: message.content, previousTutorMessage: previousTutor?.content },
      env,
    );

    const corrections = locatableCorrections(message.content, output);
    const located = { ...result, mistakes: result.mistakes.filter((m) => corrections.some((c) => c.original === m.original)) };
    await recordActivityResult({ userId: user.id, sessionId, messageId, result: located });

    const analysis = {
      corrections,
      betterVersion: output.betterVersion,
      newWords: result.newVocab,
      score: result.score,
    };
    await saveMessageAnalysis(messageId, analysis);

    // Background jobs (Inngest): learn memory facts, and add translations/usage to new flashcards.
    await Promise.all([
      user.memoryEnabled ? emit(EVENTS.messageAnalyzed, { userId: user.id, sessionId, messageId }) : null,
      result.newVocab.length ? emit(EVENTS.vocabAdded, { userId: user.id, terms: result.newVocab.map((w) => w.term) }) : null,
    ]);
    return NextResponse.json(analysis);
  } catch (err) {
    return errorResponse(err);
  }
}
