import { replyExplanationRequest, replyExplanationSchema, type ReplyExplanation } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { translationLanguage } from "@repo/core";
import { getLearnerContext, getSession, saveMessageExplanation } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse, HttpError, parseBody } from "@/lib/api";

const bodySchema = z.object({ messageId: z.string() });

const hasScript = (text: string, rtl: boolean) => !rtl || /[؀-ۿ]/.test(text);

/** Explains a tutor reply in the learner's native language (cached on the message). */
export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    const { messageId } = await parseBody(req, bodySchema);
    const user = await getCurrentUser();
    const session = await getSession(user.id, sessionId);
    const message = session?.messages.find((m) => m.id === messageId && m.role === "ASSISTANT");
    if (!message) throw new HttpError(404, "Message not found.");

    const language = translationLanguage(user.nativeLanguage);
    const cached = message.explanation as ReplyExplanation | null;
    if (cached && hasScript(cached.summary, language.rtl)) return NextResponse.json({ explanation: cached });

    const [ctx, env] = await Promise.all([getLearnerContext(user.id), aiEnvFor(user.id)]);
    const explanation = await getProvider("generator", env).structured(
      replyExplanationRequest(ctx, message.content, language.name),
      replyExplanationSchema,
      "reply_explanation",
    );
    if (!hasScript(explanation.summary, language.rtl)) {
      throw new HttpError(502, `The model answered without ${language.name} script. Retry, or pick a stronger model in Settings.`, "bad_model_output");
    }
    await saveMessageExplanation(messageId, explanation);
    return NextResponse.json({ explanation });
  } catch (err) {
    return errorResponse(err);
  }
}
