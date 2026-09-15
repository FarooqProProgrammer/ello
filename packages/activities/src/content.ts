import type { ChatRequest } from "@repo/ai";
import { MISTAKE_TYPES, type LearnerContext } from "@repo/core";
import { z } from "zod";
import { exerciseItemSchema } from "./grammar";
import { learnerProfile } from "./learner-prompt";

const nativeScript = (languageName: string) =>
  `Write ${languageName} text in its native script (for Urdu: Urdu script, never Roman Urdu).`;

// ---------------- Reading ----------------

export const READING_THEMES = ["Daily life", "Travel", "Technology", "Work & business", "Health", "Culture", "Science", "Sports", "Money", "Surprise me"];
export const READING_LENGTHS = { short: "about 150 words", medium: "about 300 words", long: "about 450 words" } as const;
export type ReadingLength = keyof typeof READING_LENGTHS;

export const readingSchema = z.object({
  title: z.string(),
  text: z.string().describe("The article/story as plain paragraphs separated by blank lines"),
  glossary: z
    .array(z.object({ term: z.string().describe("Exactly as it appears in the text"), definition: z.string(), translation: z.string() }))
    .describe("5–8 words or phrases from the text that may be new for the learner"),
  exercises: z.array(exerciseItemSchema).describe("5 comprehension exercises: mostly type 'question' (3–4 options), plus 1 fill_blank using a glossary word"),
});
export type ReadingContent = z.infer<typeof readingSchema>;

export function readingRequest(ctx: LearnerContext, theme: string, length: ReadingLength, languageName: string): ChatRequest {
  return {
    system: [
      "You write engaging reading practice for an English learner.",
      learnerProfile(ctx),
      "",
      `Write an original, interesting text of ${READING_LENGTHS[length]} at exactly the learner's level: a short article, story or blog post with concrete details.`,
      "Then add a glossary and comprehension exercises that can only be answered from the text.",
      `Glossary translations in ${languageName}. ${nativeScript(languageName)}`,
      "Plain text only, no markdown.",
    ].join("\n"),
    messages: [{ role: "user", content: `Theme: ${theme === "Surprise me" ? "any interesting everyday topic" : theme}` }],
    maxTokens: 6000,
  };
}

// ---------------- Listening ----------------

export const listeningSchema = z.object({
  title: z.string(),
  situation: z.string().describe("One sentence setting the scene, shown before listening"),
  lines: z.array(z.object({ speaker: z.string().describe("Short name, e.g. Sara"), text: z.string() })).describe("8–14 natural dialogue lines"),
  exercises: z.array(exerciseItemSchema).describe("4 comprehension exercises of type 'question' answerable only by listening"),
  dictation: z.array(z.string()).describe("3 sentences copied exactly from the dialogue for dictation, 6–14 words each"),
});
export type ListeningContent = z.infer<typeof listeningSchema>;

export function listeningRequest(ctx: LearnerContext, theme: string): ChatRequest {
  return {
    system: [
      "You write listening practice: a realistic spoken dialogue between two people.",
      learnerProfile(ctx),
      "",
      "Use natural spoken English for the learner's level: contractions, short turns, a clear situation and a little detail worth remembering (times, places, reasons).",
      "Plain text only.",
    ].join("\n"),
    messages: [{ role: "user", content: `Situation theme: ${theme === "Surprise me" ? "any everyday situation" : theme}` }],
    maxTokens: 4000,
  };
}

// ---------------- Pronunciation ----------------

export const pronunciationSentencesSchema = z.object({
  sentences: z.array(z.object({ text: z.string(), focus: z.string().describe("The sound or feature practised, e.g. 'th /θ/', 'v vs w', 'word stress'") })),
});

export function pronunciationSentencesRequest(ctx: LearnerContext, languageName: string): ChatRequest {
  return {
    system: [
      "You create pronunciation practice sentences for an English learner.",
      learnerProfile(ctx),
      `The learner's first language is ${languageName}; target sounds that speakers of it commonly find hard (for Urdu speakers e.g. th /θ ð/, v vs w, short vs long vowels, word-final consonant clusters, word stress).`,
      "Create 6 natural sentences at the learner's level, 6–12 words each, each packed with its target sound.",
    ].join("\n"),
    messages: [{ role: "user", content: "Create the sentences." }],
    maxTokens: 1024,
  };
}

export const pronunciationTipsSchema = z.object({
  tips: z.array(z.object({ word: z.string(), tip: z.string().describe("How to say it: mouth/tongue position or a simple sound-alike") })),
  summary: z.string().describe("One encouraging sentence"),
  summaryNative: z.string().describe("The same encouragement and main tip in the native language"),
});

export function pronunciationTipsRequest(ctx: LearnerContext, target: string, heard: string, missedWords: string[], languageName: string): ChatRequest {
  return {
    system: [
      "You are a friendly pronunciation coach. Speech recognition heard the learner say a sentence; words it didn't recognise were probably mispronounced.",
      learnerProfile({ ...ctx, nativeLanguage: null }),
      `Give a short practical tip for each missed word (max 4). ${nativeScript(languageName)} summaryNative is in ${languageName}.`,
    ].join("\n"),
    messages: [{ role: "user", content: `Target: "${target}"\nHeard: "${heard}"\nMissed words: ${missedWords.join(", ") || "(none)"}` }],
    maxTokens: 1024,
  };
}

// ---------------- IELTS speaking ----------------

export const ieltsQuestionsSchema = z.object({
  part1: z.array(z.string()).describe("4 Part 1 questions on familiar topics (home, work/study, hobbies…)"),
  part2: z.object({ topic: z.string().describe("Cue card: 'Describe a …'"), bullets: z.array(z.string()).describe("3–4 'You should say:' prompts") }),
  part3: z.array(z.string()).describe("3 Part 3 discussion questions related to the Part 2 topic"),
});
export type IeltsQuestions = z.infer<typeof ieltsQuestionsSchema>;

export function ieltsQuestionsRequest(ctx: LearnerContext): ChatRequest {
  return {
    system: ["You are an IELTS Speaking examiner preparing a realistic mock test.", learnerProfile(ctx), "Use authentic IELTS style and topics."].join("\n"),
    messages: [{ role: "user", content: "Create a full speaking test." }],
    maxTokens: 1024,
  };
}

export const ieltsFeedbackSchema = z.object({
  overallBand: z.number().describe("1–9 in 0.5 steps"),
  criteria: z
    .array(z.object({ name: z.string(), band: z.number(), comment: z.string() }))
    .describe("Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, Pronunciation (estimate from transcript; say so)"),
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  betterAnswers: z.array(z.object({ question: z.string(), answer: z.string() })).describe("Band-8 model answers for 2 of the questions, in natural spoken style"),
  corrections: z.array(
    z.object({ type: z.enum(MISTAKE_TYPES), category: z.string(), original: z.string(), corrected: z.string(), explanation: z.string() }),
  ),
});
export type IeltsFeedback = z.infer<typeof ieltsFeedbackSchema>;

export function ieltsFeedbackRequest(ctx: LearnerContext, answers: { part: number; question: string; answer: string }[]): ChatRequest {
  return {
    system: [
      "You are a certified IELTS Speaking examiner. Assess the candidate's transcript fairly using the official band descriptors.",
      learnerProfile({ ...ctx, memories: [] }),
      "The answers are speech-to-text transcripts: ignore punctuation/capitalisation, and treat unclear words carefully. Very short or empty answers lower Fluency and Coherence.",
      "corrections: real grammar/vocabulary errors, `original` copied exactly from an answer (max 10).",
    ].join("\n"),
    messages: [{ role: "user", content: answers.map((a) => `Part ${a.part} — Q: ${a.question}\nA: ${a.answer || "(no answer)"}`).join("\n\n") }],
    maxTokens: 6000,
  };
}

export const ieltsTaskSchema = z.object({ question: z.string().describe("A realistic IELTS Writing Task 2 question") });

export function ieltsTaskRequest(ctx: LearnerContext): ChatRequest {
  return {
    system: ["You write authentic IELTS Writing Task 2 questions (opinion, discussion, problem-solution, advantages-disadvantages).", learnerProfile({ ...ctx, memories: [] })].join("\n"),
    messages: [{ role: "user", content: "Give me one question with its full instruction line." }],
    maxTokens: 512,
  };
}

// ---------------- Idioms & phrasal verbs ----------------

export const IDIOM_THEMES = ["Office & work", "Travel", "Daily life", "Emotions", "Money", "Relationships", "Food", "Time", "Success & failure", "Weather & nature"];
export const IDIOM_KINDS = { idioms: "idioms", "phrasal-verbs": "phrasal verbs" } as const;
export type IdiomKind = keyof typeof IDIOM_KINDS;

export const idiomPackSchema = z.object({
  items: z
    .array(
      z.object({
        term: z.string(),
        meaning: z.string().describe("Simple English meaning"),
        translation: z.string().describe("Meaning in the native language"),
        example: z.string(),
        usage: z.string().describe("When to use it: formal/informal, typical situations"),
      }),
    )
    .describe("8 common, genuinely useful items"),
  exercises: z.array(exerciseItemSchema).describe("8 exercises using the items: multiple_choice and fill_blank with ___, one per item"),
});
export type IdiomPack = z.infer<typeof idiomPackSchema>;

export function idiomPackRequest(ctx: LearnerContext, theme: string, kind: IdiomKind, known: string[], languageName: string): ChatRequest {
  return {
    system: [
      `You teach common English ${IDIOM_KINDS[kind]} to a learner.`,
      learnerProfile(ctx),
      `Choose frequently used ${IDIOM_KINDS[kind]} suitable for the learner's level (not rare or old-fashioned). Skip any in the known list.`,
      `Translations in ${languageName}. ${nativeScript(languageName)}`,
    ].join("\n"),
    messages: [{ role: "user", content: `Theme: ${theme}${known.length ? `\nKnown: ${known.slice(0, 150).join(", ")}` : ""}` }],
    maxTokens: 6000,
  };
}
