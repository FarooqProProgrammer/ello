import { ieltsFeedbackRequest, ieltsFeedbackSchema, type IeltsQuestions } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { getActivitySession, getLearnerContext, recordActivityResult, updateSessionData } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse, HttpError, parseBody } from "@/lib/api";

const bodySchema = z.object({
  answers: z.array(z.object({ part: z.number().int().min(1).max(3), question: z.string().max(500), answer: z.string().max(5000) })).min(1).max(20),
});

/** Examiner-style band feedback for a finished speaking mock test. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { answers } = await parseBody(req, bodySchema);
    const user = await getCurrentUser();
    const session = await getActivitySession(user.id, id, "ielts-speaking");
    if (!session) throw new HttpError(404, "Test not found.");
    const data = session.data as { questions: IeltsQuestions; feedback?: unknown };
    if (session.endedAt && data.feedback) return NextResponse.json({ feedback: data.feedback });

    const [ctx, env] = await Promise.all([getLearnerContext(user.id), aiEnvFor(user.id)]);
    const raw = await getProvider("grader", env).structured(ieltsFeedbackRequest(ctx, answers), ieltsFeedbackSchema, "ielts_feedback");
    const allText = answers.map((a) => a.answer).join("\n");
    const feedback = {
      ...raw,
      overallBand: Math.max(1, Math.min(9, Math.round(raw.overallBand * 2) / 2)),
      corrections: raw.corrections.filter((c) => c.original.trim() && allText.includes(c.original)).slice(0, 10),
    };

    await updateSessionData(id, { ...data, answers, feedback });
    await recordActivityResult({
      userId: user.id,
      sessionId: id,
      result: {
        score: Math.round((feedback.overallBand / 9) * 100),
        skill: "SPEAKING",
        mistakes: feedback.corrections.map((c) => ({ ...c, category: c.category.toLowerCase().trim() })),
        newVocab: [],
      },
      endSession: true,
    });
    return NextResponse.json({ feedback });
  } catch (err) {
    return errorResponse(err);
  }
}
