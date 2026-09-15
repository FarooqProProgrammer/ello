import type { Goal, Skill } from "@repo/core";

export { LANGUAGES, languageName, translationLanguage, type TranslationLanguage } from "@repo/core";

export const GOAL_LABELS: Record<Goal, { label: string; hint: string }> = {
  CONVERSATION: { label: "Everyday conversation", hint: "Small talk, friends, daily life" },
  BUSINESS: { label: "Work & meetings", hint: "Emails, calls, presentations" },
  EXAM: { label: "Exams", hint: "IELTS, TOEFL, Cambridge" },
  PRONUNCIATION: { label: "Pronunciation", hint: "Sound clear and natural" },
};

export const SKILL_LABELS: Record<Skill, string> = {
  SPEAKING: "Speaking",
  LISTENING: "Listening",
  READING: "Reading",
  WRITING: "Writing",
  GRAMMAR: "Grammar",
  VOCAB: "Vocabulary",
};

export function humanizeCategory(category: string): string {
  const s = category.replace(/[-_]/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
