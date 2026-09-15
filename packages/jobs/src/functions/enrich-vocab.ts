import { vocabEntryRequest, vocabEntrySchema } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { translationLanguage } from "@repo/core";
import { getEffectiveEnv, getLearnerContext, getUserById, getVocabItem, saveEnrichedVocab } from "@repo/db";
import { inngest } from "../client";
import { EVENTS, vocabAddedData } from "../events";

const MAX_TERMS_PER_EVENT = 10;

/** Fills in native-language meaning, usage notes and part of speech for flashcards added from chats. */
export const enrichVocab = inngest.createFunction(
  {
    id: "enrich-vocab",
    retries: 2,
    concurrency: { limit: 2 },
    triggers: [{ event: EVENTS.vocabAdded }],
  },
  async ({ event, step }) => {
    const { userId, terms } = vocabAddedData.parse(event.data);
    const results: Record<string, string> = {};

    for (const raw of [...new Set(terms.map((t) => t.trim().toLowerCase()))].slice(0, MAX_TERMS_PER_EVENT)) {
      results[raw] = await step.run(`enrich-${raw}`, async () => {
        const item = await getVocabItem(userId, raw);
        if (!item) return "not found";
        if (item.translation && item.usageNote) return "already enriched";

        const user = await getUserById(userId);
        const [ctx, env] = await Promise.all([getLearnerContext(userId), getEffectiveEnv(userId)]);
        const language = translationLanguage(user?.nativeLanguage);
        const entry = await getProvider("generator", env).structured(
          vocabEntryRequest(ctx, item.term, item.example ?? undefined, language.name),
          vocabEntrySchema,
          "vocab_entry",
        );
        // Keep the stored term (it's the flashcard's identity) and its example if it came from the chat.
        await saveEnrichedVocab(userId, { ...entry, term: item.term, example: item.example || entry.example }, item.source);
        return "enriched";
      });
    }
    return results;
  },
);
