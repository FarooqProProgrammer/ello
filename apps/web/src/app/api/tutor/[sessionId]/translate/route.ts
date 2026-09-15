import { translationRequest } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { getSession, saveMessageTranslation } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse, HttpError, parseBody } from "@/lib/api";
import { translationLanguage } from "@/lib/labels";

const bodySchema = z.object({ messageId: z.string() });

/** RTL targets (Urdu, Arabic, Persian) must contain Arabic-script letters. */
function hasExpectedScript(text: string, rtl: boolean): boolean {
  return !rtl || /[؀-ۿ]/.test(text);
}

/** Translates one chat message into the learner's native language (cached on the message). */
export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    const { messageId } = await parseBody(req, bodySchema);
    const user = await getCurrentUser();
    const session = await getSession(user.id, sessionId);
    const message = session?.messages.find((m) => m.id === messageId);
    if (!message) throw new HttpError(404, "Message not found.");

    const language = translationLanguage(user.nativeLanguage);
    // Reuse the saved translation unless it's in the wrong script (e.g. Roman Urdu from an older model reply).
    if (message.translation && hasExpectedScript(message.translation, language.rtl)) {
      return NextResponse.json({ translation: message.translation });
    }
    const provider = getProvider("generator", await aiEnvFor(user.id));
    const { text } = await provider.chat(translationRequest(message.content, language.name));
    const translation = text.trim();
    if (!translation) throw new HttpError(502, "The model returned an empty translation.");
    if (!hasExpectedScript(translation, language.rtl)) {
      throw new HttpError(502, `The model answered without ${language.name} script. Retry, or pick a stronger model in Settings.`, "bad_model_output");
    }

    await saveMessageTranslation(messageId, translation);
    return NextResponse.json({ translation });
  } catch (err) {
    return errorResponse(err);
  }
}
