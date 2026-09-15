import type { ChatRequest } from "@repo/ai";
import type { LearnerContext, WeeklyStats } from "@repo/core";
import { z } from "zod";
import { learnerProfile } from "./learner-prompt";

const nativeScript = (languageName: string) => `Use ${languageName}'s native script (for Urdu: Urdu script, never Roman Urdu).`;

// ---------------- Weekly report ----------------

export const weeklyReportSchema = z.object({
  headline: z.string().describe("Up to 10 words capturing the week"),
  summary: z.string().describe("3–4 warm, specific sentences based only on the numbers given"),
  wins: z.array(z.string()).describe("2–4 concrete wins from the stats"),
  focusAreas: z
    .array(z.object({ title: z.string(), why: z.string(), action: z.string().describe("A specific activity for next week, e.g. 'Do the Articles grammar practice twice'") }))
    .describe("2–3 focus areas, prioritised"),
  goals: z.array(z.string()).describe("3 small, measurable goals for next week"),
  encouragementNative: z.string().describe("2 encouraging sentences in the native language"),
});
export type WeeklyReport = z.infer<typeof weeklyReportSchema>;

export function weeklyReportRequest(ctx: LearnerContext, stats: WeeklyStats, languageName: string): ChatRequest {
  return {
    system: [
      "You are the learner's English coach writing their weekly progress report.",
      learnerProfile(ctx),
      "",
      "Base everything on the stats JSON. Don't invent numbers. If the learner barely practised, be kind and make the goals very achievable.",
      "Activity ids: tutor-chat (conversation), grammar, daily (daily review), writing, reading, listening, pronunciation, flashcards, vocab-quiz, idioms, mistakes, ielts-speaking.",
      `encouragementNative is in ${languageName}. ${nativeScript(languageName)} Everything else in simple English. No markdown.`,
    ].join("\n"),
    messages: [{ role: "user", content: JSON.stringify(stats) }],
    maxTokens: 2048,
  };
}

// ---------------- Explain a tutor reply in the native language ----------------

export const replyExplanationSchema = z.object({
  summary: z.string().describe("2–3 sentences in the native language: what the reply means and its tone"),
  points: z
    .array(
      z.object({
        english: z.string().describe("A phrase copied exactly from the reply"),
        note: z.string().describe("Native-language note on its meaning, grammar or why it is used"),
      }),
    )
    .describe("2–4 phrases worth understanding"),
});
export type ReplyExplanation = z.infer<typeof replyExplanationSchema>;

export function replyExplanationRequest(ctx: LearnerContext, text: string, languageName: string): ChatRequest {
  return {
    system: [
      `You help an English learner understand their tutor's message by explaining it in ${languageName}.`,
      learnerProfile({ ...ctx, nativeLanguage: null, memories: [] }),
      `Write summary and notes in ${languageName}. ${nativeScript(languageName)} Keep the English phrases exactly as in the message.`,
      "Focus on things a learner at this level might not understand: idioms, phrasal verbs, tenses, polite forms.",
    ].join("\n"),
    messages: [{ role: "user", content: `Tutor's message: """${text}"""` }],
    maxTokens: 1500,
  };
}
