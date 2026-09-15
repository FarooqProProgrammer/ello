import { keyWordsRequest, keyWordsSchema, vocabEntryRequest, vocabEntrySchema } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { cleanSelection, translationLanguage } from "@repo/core";
import { getLearnerContext, listVocab, saveEnrichedVocab } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse, HttpError, parseBody } from "@/lib/api";

const bodySchema = z.object({ text: z.string().min(1).max(4000) });

/** "Add to dictionary" on a tutor reply: AI picks 1–3 useful words and saves full dictionary entries. */
export async function POST(req: Request) {
  try {
    const { text } = await parseBody(req, bodySchema);
    const user = await getCurrentUser();
    const [ctx, env, existing] = await Promise.all([getLearnerContext(user.id), aiEnvFor(user.id), listVocab(user.id)]);
    const provider = getProvider("generator", env);

    const { words } = await provider.structured(keyWordsRequest(ctx, text, existing.map((v) => v.term)), keyWordsSchema, "key_words");
    const picks = [...new Set(words.map((w) => cleanSelection(w)).filter((w): w is string => Boolean(w)))].slice(0, 3);
    if (!picks.length) throw new HttpError(422, "No new words worth saving in this message.");

    const language = translationLanguage(user.nativeLanguage);
    const saved = await Promise.all(
      picks.map(async (word) => {
        try {
          const entry = await provider.structured(vocabEntryRequest(ctx, word, text.slice(0, 500), language.name), vocabEntrySchema, "vocab_entry");
          const { item } = await saveEnrichedVocab(user.id, { ...entry, term: cleanSelection(entry.term) ?? word }, "tutor-chat");
          return { id: item.id, term: item.term, translation: item.translation };
        } catch {
          return null;
        }
      }),
    );
    const words_ = saved.filter((s) => s !== null);
    if (!words_.length) throw new HttpError(502, "Couldn't create dictionary entries. Try again.");
    return NextResponse.json({ words: words_ });
  } catch (err) {
    return errorResponse(err);
  }
}
