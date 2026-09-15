import type { ChatRequest } from "@repo/ai";

/** Plain-text translation of one chat message into the learner's native language. */
export function translationRequest(text: string, languageName: string): ChatRequest {
  return {
    system: [
      `You translate English sentences for a language learner into natural, simple ${languageName}.`,
      `Reply with only the ${languageName} translation — no quotes, notes, transliteration, or English.`,
      `Use the standard native script of ${languageName} (for Urdu: Urdu script like "میں ٹھیک ہوں" — never Roman Urdu like "main theek hoon").`,
      "Keep names, numbers and emojis as they are. If the text contains a mistake, translate the intended meaning.",
    ].join("\n"),
    messages: [{ role: "user", content: text }],
    maxTokens: 1024,
  };
}
