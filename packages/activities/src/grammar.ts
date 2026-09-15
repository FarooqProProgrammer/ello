import type { ChatRequest } from "@repo/ai";
import type { ActivityResult, GrammarTopic, LearnerContext } from "@repo/core";
import { z } from "zod";
import { learnerProfile } from "./learner-prompt";

// ---------- Lesson ----------

export const grammarLessonSchema = z.object({
  summary: z.string().describe("2–3 sentence overview of when and why this grammar is used"),
  rules: z
    .array(
      z.object({
        title: z.string().describe("Short rule name, e.g. 'Positive sentences'"),
        explanation: z.string().describe("Clear explanation at the learner's level; include the form/pattern"),
        examples: z.array(z.string()).describe("2–4 natural example sentences"),
      }),
    )
    .describe("3–5 rules, simplest first"),
  commonMistakes: z
    .array(z.object({ wrong: z.string(), right: z.string(), why: z.string() }))
    .describe("3–4 typical learner mistakes"),
  nativeLanguageNote: z
    .string()
    .describe("2–3 sentences in the learner's native language comparing it with English; empty string if none given"),
  tip: z.string().describe("One memorable tip or mnemonic"),
});

export type GrammarLesson = z.infer<typeof grammarLessonSchema>;

export function grammarLessonRequest(ctx: LearnerContext, topic: GrammarTopic): ChatRequest {
  return {
    system: [
      "You are an expert English grammar teacher writing a short, friendly lesson.",
      learnerProfile(ctx),
      "",
      "Rules:",
      `- Write for a ${ctx.level} learner even if the topic is from another level: simple words, short sentences.`,
      "- Use everyday, modern example sentences (work, travel, friends, phones), not textbook clichés.",
      "- Show the pattern explicitly, e.g. 'subject + have/has + past participle'.",
      "- No markdown symbols (#, *, backticks) — plain text only.",
      ctx.nativeLanguage
        ? `- nativeLanguageNote: write it in the language with code "${ctx.nativeLanguage}" using its native script (Urdu script for Urdu, never Roman Urdu), comparing with how that language expresses the idea.`
        : "- nativeLanguageNote: return an empty string.",
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: `Topic: ${topic.title} (${topic.level}) — ${topic.summary}`,
      },
    ],
    maxTokens: 4096,
  };
}

// ---------- Practice ----------

export const EXERCISE_TYPES = ["multiple_choice", "fill_blank", "correct_sentence", "reorder", "question"] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const exerciseItemSchema = z.object({
  type: z.enum(EXERCISE_TYPES),
  prompt: z
    .string()
    .describe(
      "multiple_choice/fill_blank: a sentence with ___ for the gap; correct_sentence: a sentence containing exactly one error; reorder: a short instruction or meaning hint; question: a comprehension question",
    ),
  options: z
    .array(z.string())
    .describe("multiple_choice/question: 3–4 choices; reorder: the words/chunks of the answer in shuffled order; otherwise []"),
  answer: z
    .string()
    .describe("multiple_choice/question: the exact correct option; fill_blank: the missing word(s); correct_sentence/reorder: the full correct sentence"),
  acceptableAnswers: z.array(z.string()).describe("Other fully correct answers (e.g. contractions); may be []"),
  explanation: z.string().describe("One short sentence explaining why the answer is correct"),
});

export const exerciseSetSchema = z.object({
  exercises: z.array(exerciseItemSchema),
});

export type RawExercise = z.infer<typeof exerciseSetSchema>["exercises"][number];

export interface PracticeExercise extends RawExercise {
  id: string;
}

/** What the browser sees: no answers or explanations. */
export type PublicExercise = Pick<PracticeExercise, "id" | "type" | "prompt" | "options">;

export function grammarExercisesRequest(ctx: LearnerContext, topic: GrammarTopic, count = 10): ChatRequest {
  return {
    system: [
      "You create grammar practice exercises for an English learner.",
      learnerProfile(ctx),
      "",
      `Create exactly ${count} exercises that practise ONLY this topic, in this mix:`,
      "- 3 multiple_choice (prompt has one ___ gap; 3–4 options; exactly one option is correct)",
      "- 3 fill_blank (prompt has one ___ gap; the learner types the missing word(s); give a base-form hint in brackets when a verb is needed, e.g. 'She ___ (go) to work yesterday.')",
      "- 2 correct_sentence (prompt is one sentence with exactly one mistake related to the topic)",
      "- 2 reorder (options are the answer's words or short chunks, shuffled; prompt is a short hint like 'Make a question')",
      "Rules:",
      `- Vocabulary suitable for ${ctx.level}; vary contexts; never repeat a sentence.`,
      "- Answers must be unambiguous; list genuine alternatives in acceptableAnswers.",
      "- Do not reveal the answer in the prompt.",
    ].join("\n"),
    messages: [{ role: "user", content: `Topic: ${topic.title} (${topic.level}) — ${topic.summary}` }],
    maxTokens: 6000,
  };
}

export function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/[“”"]/g, "")
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Drops malformed exercises and assigns stable ids so the model's output can be trusted by the UI. */
export function sanitizeExercises(raw: RawExercise[]): PracticeExercise[] {
  const out: PracticeExercise[] = [];
  for (const ex of raw) {
    const prompt = ex.prompt.trim();
    const answer = ex.answer.trim();
    if (!prompt || !answer) continue;
    const options = ex.options.map((o) => o.trim()).filter(Boolean);
    let fixedAnswer = answer;

    if (ex.type === "multiple_choice" || ex.type === "question") {
      const match = options.find((o) => normalizeAnswer(o) === normalizeAnswer(answer));
      if (!match || options.length < 2 || (ex.type === "multiple_choice" && !prompt.includes("___"))) continue;
      fixedAnswer = match;
    }
    if (ex.type === "fill_blank" && !prompt.includes("___")) continue;
    if (ex.type === "reorder") {
      const answerWords = normalizeAnswer(answer).split(" ").sort().join(" ");
      const optionWords = normalizeAnswer(options.join(" ")).split(" ").sort().join(" ");
      if (options.length < 2 || answerWords !== optionWords) continue;
    }

    out.push({
      ...ex,
      id: `q${out.length + 1}`,
      prompt,
      answer: fixedAnswer,
      options: ex.type === "multiple_choice" || ex.type === "question" || ex.type === "reorder" ? options : [],
      acceptableAnswers: ex.acceptableAnswers.map((a) => a.trim()).filter(Boolean),
    });
  }
  return out;
}

export function publicExercise({ id, type, prompt, options }: PracticeExercise): PublicExercise {
  return { id, type, prompt, options };
}

/** true/false when the answer can be checked exactly; null when an AI check is needed. */
export function quickCheck(ex: PracticeExercise, given: string): boolean | null {
  const g = normalizeAnswer(given);
  if (!g) return false;
  const accepted = [ex.answer, ...ex.acceptableAnswers].map(normalizeAnswer);
  if (accepted.includes(g)) return true;
  // Multiple choice and word order have a fixed answer; free-text answers may be phrased differently.
  return ex.type === "multiple_choice" || ex.type === "question" || ex.type === "reorder" ? false : null;
}

export const answerCheckSchema = z.object({
  correct: z.boolean().describe("true only if the learner's answer is grammatically correct AND fulfils the exercise"),
  feedback: z.string().describe("One short, encouraging sentence; if wrong, say what to change"),
});

export function answerCheckRequest(ctx: LearnerContext, topic: GrammarTopic | null, ex: PracticeExercise, given: string): ChatRequest {
  return {
    system: [
      "You check one answer to an English grammar exercise.",
      learnerProfile(ctx),
      `${topic ? `Topic: ${topic.title}. ` : ""}Be fair: accept answers that are fully correct even if they differ from the expected answer, but reject any grammar error.`,
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: [
          `Exercise type: ${ex.type}`,
          `Prompt: ${ex.prompt}`,
          `Expected answer: ${ex.answer}`,
          `Learner's answer: ${given}`,
        ].join("\n"),
      },
    ],
    maxTokens: 512,
  };
}

export interface AnswerRecord {
  exerciseId: string;
  given: string;
  correct: boolean;
}

export function grammarPracticeResult(topic: GrammarTopic, exercises: PracticeExercise[], answers: AnswerRecord[]): ActivityResult {
  const answered = answers.filter((a) => exercises.some((e) => e.id === a.exerciseId));
  const correct = answered.filter((a) => a.correct).length;
  return {
    score: answered.length ? Math.round((correct / answered.length) * 100) : null,
    skill: "GRAMMAR",
    mistakes: answered
      .filter((a) => !a.correct)
      .map((a) => {
        const ex = exercises.find((e) => e.id === a.exerciseId)!;
        return {
          type: "GRAMMAR" as const,
          category: topic.categories[0] ?? topic.id,
          original: a.given || "(no answer)",
          corrected: ex.answer,
          explanation: ex.explanation,
        };
      }),
    newVocab: [],
  };
}
