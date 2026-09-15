import type { ChatRequest } from "@repo/ai";
import type { LearnerContext } from "@repo/core";
import { z } from "zod";
import { learnerProfile } from "./learner-prompt";

export const vocabEntrySchema = z.object({
  term: z
    .string()
    .describe("Dictionary form of the selection: 'went' → 'go', 'children' → 'child'; keep phrasal verbs and idioms whole"),
  partOfSpeech: z.string().describe("e.g. noun, verb, adjective, phrasal verb, idiom"),
  definition: z.string().describe("Simple English meaning as used in the given context, at the learner's level"),
  translation: z.string().describe("The meaning in the native language: a word or short phrase, not a sentence"),
  usageNote: z
    .string()
    .describe("1–2 simple English sentences on WHEN to use it: formal/informal, typical situations, common word partners, and what to avoid"),
  usageNative: z.string().describe("The same usage note written in the native language"),
  example: z.string().describe("One natural example sentence at the learner's level that shows typical use"),
});

export type VocabEntry = z.infer<typeof vocabEntrySchema>;

export const keyWordsSchema = z.object({
  words: z
    .array(z.string())
    .describe("1–3 words or short phrases from the text that are most useful for this learner to learn, in the form used in the text"),
});

/** Picks the most useful words from a tutor reply for the learner's dictionary. */
export function keyWordsRequest(ctx: LearnerContext, text: string, exclude: string[]): ChatRequest {
  return {
    system: [
      "You choose vocabulary for an English learner's personal dictionary.",
      learnerProfile({ ...ctx, nativeLanguage: null, memories: [] }),
      "Pick 1–3 words, phrasal verbs, collocations or idioms from the text that are slightly above the learner's level and useful in everyday life.",
      "Skip names, very basic words (the, is, go, good), and anything in the exclude list.",
      "Copy each item exactly as it appears in the text.",
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: `Text: """${text}"""${exclude.length ? `\nExclude: ${exclude.slice(0, 200).join(", ")}` : ""}`,
      },
    ],
    maxTokens: 256,
  };
}

export function vocabEntryRequest(ctx: LearnerContext, selection: string, context: string | undefined, languageName: string): ChatRequest {
  return {
    system: [
      `You are a friendly English–${languageName} learner's dictionary.`,
      learnerProfile({ ...ctx, nativeLanguage: null }),
      "",
      `Write translation and usageNative in ${languageName} using its native script (for Urdu: Urdu script, never Roman Urdu). Everything else in simple English.`,
      "Explain the meaning the word has in the given context, not every possible meaning.",
      "Plain text only, no markdown.",
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: [`Selected text: "${selection}"`, context ? `Context: "${context}"` : null].filter(Boolean).join("\n"),
      },
    ],
    maxTokens: 1024,
  };
}
