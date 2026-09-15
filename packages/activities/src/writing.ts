import type { ChatRequest } from "@repo/ai";
import { GRAMMAR_TOPICS, MISTAKE_TYPES, type ActivityResult, type LearnerContext } from "@repo/core";
import { z } from "zod";
import { learnerProfile } from "./learner-prompt";

export const WRITING_TYPES = [
  { id: "message", label: "Message", hint: "WhatsApp, Slack, social media" },
  { id: "email", label: "Email", hint: "Work or formal emails" },
  { id: "essay", label: "Essay / paragraph", hint: "Opinion, story, school work" },
  { id: "ielts-task2", label: "IELTS Writing Task 2", hint: "250+ word argument essay" },
  { id: "cover-letter", label: "Cover letter", hint: "Job applications" },
] as const;

export type WritingTypeId = (typeof WRITING_TYPES)[number]["id"];

export const writingFeedbackSchema = z.object({
  score: z.number().describe("Overall 0–100 for this kind of text at the learner's level"),
  ieltsBand: z.number().describe("For ielts-task2: overall band 1–9 in 0.5 steps; otherwise 0"),
  summary: z.string().describe("2–3 encouraging sentences: overall impression and the single most important thing to fix"),
  criteria: z
    .array(z.object({ name: z.string(), score: z.number(), comment: z.string() }))
    .describe(
      "ielts-task2: Task Response, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy (score = band 1–9). Otherwise: Grammar, Vocabulary, Clarity, Tone (score 0–100).",
    ),
  corrections: z
    .array(
      z.object({
        type: z.enum(MISTAKE_TYPES),
        category: z.string().describe(`kebab-case; prefer: ${[...new Set(GRAMMAR_TOPICS.flatMap((t) => t.categories))].join(", ")}`),
        original: z.string().describe("Exact erroneous span copied from the text"),
        corrected: z.string(),
        explanation: z.string().describe("One short sentence"),
      }),
    )
    .describe("Every real error, in text order (max 25)"),
  improvedVersion: z.string().describe("The whole text rewritten naturally, keeping the writer's meaning and voice"),
  strengths: z.array(z.string()).describe("2–3 specific strengths"),
  improvements: z.array(z.string()).describe("2–4 specific, actionable improvements"),
  vocabularyUpgrades: z
    .array(z.object({ original: z.string(), better: z.string(), why: z.string() }))
    .describe("2–5 words/phrases that could be more precise or natural"),
  grammarTopicIds: z.array(z.string()).describe(`0–3 lesson ids to study, only from: ${GRAMMAR_TOPICS.map((t) => t.id).join(", ")}`),
});

export type WritingFeedback = z.infer<typeof writingFeedbackSchema>;

const TYPE_GUIDANCE: Record<WritingTypeId, string> = {
  message: "An informal message. Natural, friendly, concise English is the goal; don't penalise casual style that is correct.",
  email: "An email. Check greeting/closing, clear purpose, politeness, paragraphing and appropriate formality.",
  essay: "An essay or paragraph. Check structure, linking words, argument clarity, and variety of sentences.",
  "ielts-task2":
    "An IELTS Academic/General Writing Task 2 essay. Assess like an examiner using the four official criteria and band descriptors. Note if it is under 250 words.",
  "cover-letter": "A cover letter. Check professional tone, relevance to the job, strong verbs, and concise structure.",
};

export function writingFeedbackRequest(ctx: LearnerContext, type: WritingTypeId, text: string, taskPrompt?: string): ChatRequest {
  return {
    system: [
      "You are an expert English writing coach giving detailed, kind, precise feedback.",
      learnerProfile(ctx),
      "",
      `Text type: ${TYPE_GUIDANCE[type]}`,
      "Rules:",
      "- `original` in corrections must be an exact substring of the text so it can be highlighted.",
      "- Only flag real errors; put style suggestions in improvements or vocabularyUpgrades instead.",
      "- The improved version must keep the writer's ideas; don't add new content.",
      "- Plain text only, no markdown.",
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: [taskPrompt?.trim() ? `Task: """${taskPrompt.trim()}"""` : null, `Text (${text.trim().split(/\s+/).length} words):\n"""${text}"""`]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
    maxTokens: 8000,
  };
}

/** Keeps highlightable corrections and valid lesson ids; builds the ActivityResult for progress tracking. */
export function writingResult(text: string, feedback: WritingFeedback): { feedback: WritingFeedback; result: ActivityResult } {
  const corrections = feedback.corrections.filter((c) => c.original.trim() && text.includes(c.original)).slice(0, 25);
  const validTopics = new Set(GRAMMAR_TOPICS.map((t) => t.id));
  const cleaned: WritingFeedback = {
    ...feedback,
    score: Math.max(0, Math.min(100, Math.round(feedback.score))),
    ieltsBand: Math.max(0, Math.min(9, Math.round(feedback.ieltsBand * 2) / 2)),
    corrections,
    grammarTopicIds: feedback.grammarTopicIds.filter((id) => validTopics.has(id)).slice(0, 3),
  };
  return {
    feedback: cleaned,
    result: {
      score: cleaned.score,
      skill: "WRITING",
      mistakes: corrections.map((c) => ({ ...c, category: c.category.toLowerCase().trim() })),
      newVocab: [],
    },
  };
}
