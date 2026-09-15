import { TUTOR_TOPICS } from "@repo/activities";
import { describeRoles } from "@repo/ai";
import type { Env } from "@repo/config";
import { listScenarios, listTutorChats } from "@repo/db";

export { translationLanguage } from "@/lib/labels";

const ROLE_NAMES = { tutor: "Tutor conversation", grader: "Corrections & grading", generator: "Content generation" } as const;
const PROVIDER_NAMES: Record<string, string> = { anthropic: "Anthropic", openai: "OpenAI-compatible" };

export const topicOptions = TUTOR_TOPICS.map((t) => ({ id: t.id, label: t.label, prompt: t.prompt }));

export interface ScenarioOption {
  id: string;
  title: string;
  description: string;
}

export async function customScenarios(userId: string): Promise<ScenarioOption[]> {
  return listScenarios(userId);
}

/** A topic id from the URL is valid if it's built in or one of the learner's scenarios. */
export function isKnownTopic(topicId: string | undefined, scenarios: ScenarioOption[]): topicId is string {
  if (!topicId) return false;
  if (topicId.startsWith("custom:")) return scenarios.some((s) => `custom:${s.id}` === topicId);
  return TUTOR_TOPICS.some((t) => t.id === topicId);
}

/** Why the chat can't run yet, or null. The chat needs the tutor (replies) and the grader (corrections). */
export function setupMessageFor(env: Env): string | null {
  const missing = describeRoles(env).filter((r) => r.role !== "generator" && !r.configured);
  if (!missing.length) return null;
  return `${missing
    .map((r) => `${ROLE_NAMES[r.role]} uses ${PROVIDER_NAMES[r.provider] ?? r.provider}`)
    .join(" and ")}, which has no API key. Connect a provider in Settings.`;
}

export async function chatSummaries(userId: string) {
  const chats = await listTutorChats(userId);
  return chats.map((c) => ({
    id: c.id,
    title: c.title ?? "Untitled chat",
    topicLabel: c.scenarioTitle ?? TUTOR_TOPICS.find((t) => t.id === c.topicId)?.label ?? null,
    preview: c.preview,
    lastMessageAt: c.lastMessageAt.toISOString(),
    messageCount: c.messageCount,
  }));
}

export type ChatSummary = Awaited<ReturnType<typeof chatSummaries>>[number];
