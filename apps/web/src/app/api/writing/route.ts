import { WRITING_TYPES, writingFeedbackRequest, writingFeedbackSchema, writingResult } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { createSession, getLearnerContext, recordActivityResult } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse, parseBody } from "@/lib/api";

const bodySchema = z.object({
  type: z.enum(WRITING_TYPES.map((t) => t.id) as [string, ...string[]]),
  text: z.string().trim().min(20, "Write at least a couple of sentences (20+ characters).").max(6000, "Keep it under 6000 characters."),
  taskPrompt: z.string().max(1000).optional(),
});

/** Writing coach: AI feedback on a piece of writing, saved to history and progress. */
export async function POST(req: Request) {
  try {
    const body = await parseBody(req, bodySchema);
    const type = body.type as (typeof WRITING_TYPES)[number]["id"];
    const user = await getCurrentUser();
    const [ctx, env] = await Promise.all([getLearnerContext(user.id), aiEnvFor(user.id)]);

    const raw = await getProvider("grader", env).structured(writingFeedbackRequest(ctx, type, body.text, body.taskPrompt), writingFeedbackSchema, "writing_feedback");
    const { feedback, result } = writingResult(body.text, raw);

    const words = body.text.split(/\s+/);
    const title = words.slice(0, 8).join(" ") + (words.length > 8 ? "…" : "");
    const session = await createSession(user.id, "writing", title, {
      topicId: type,
      data: { type, text: body.text, taskPrompt: body.taskPrompt ?? null, feedback },
    });
    await recordActivityResult({ userId: user.id, sessionId: session.id, result, vocabSource: "writing", endSession: true });

    return NextResponse.json({ id: session.id });
  } catch (err) {
    return errorResponse(err);
  }
}
