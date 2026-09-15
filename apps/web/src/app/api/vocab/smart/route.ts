import { vocabEntryRequest, vocabEntrySchema } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { cleanSelection } from "@repo/core";
import { getLearnerContext, saveEnrichedVocab } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse, HttpError, parseBody } from "@/lib/api";
import { translationLanguage } from "@/lib/labels";

const bodySchema = z.object({
  text: z.string().max(200),
  context: z.string().max(600).optional(),
});

/** Selected word → AI dictionary entry (meaning, native translation, when to use) → flashcard. */
export async function POST(req: Request) {
  try {
    const body = await parseBody(req, bodySchema);
    const selection = cleanSelection(body.text);
    if (!selection) throw new HttpError(400, "Select an English word or short phrase (up to 6 words).");

    const user = await getCurrentUser();
    const language = translationLanguage(user.nativeLanguage);
    const [ctx, env] = await Promise.all([getLearnerContext(user.id), aiEnvFor(user.id)]);

    const entry = await getProvider("generator", env).structured(
      vocabEntryRequest(ctx, selection, body.context?.trim() || undefined, language.name),
      vocabEntrySchema,
      "vocab_entry",
    );
    const term = cleanSelection(entry.term) ?? selection;
    const { item, alreadyExisted } = await saveEnrichedVocab(user.id, { ...entry, term });

    return NextResponse.json({
      id: item.id,
      term: item.term,
      partOfSpeech: item.partOfSpeech,
      definition: item.definition,
      translation: item.translation,
      usageNote: item.usageNote,
      usageNative: item.usageNative,
      example: item.example,
      alreadyExisted,
      language,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
