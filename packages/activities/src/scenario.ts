import type { ChatRequest } from "@repo/ai";
import type { LearnerContext } from "@repo/core";
import { z } from "zod";
import { learnerProfile } from "./learner-prompt";

export const SCENARIO_FIELDS = ["title", "description"] as const;
export type ScenarioField = (typeof SCENARIO_FIELDS)[number];

export const refinedScenarioSchema = z.object({
  title: z.string().describe("Short, specific scenario title, 2–6 words, max 60 characters, no quotes or emojis"),
  description: z
    .string()
    .describe(
      "Clear role-play instructions for the AI tutor in English, 3–6 sentences, max 1200 characters, plain text, written to the tutor ('You are …')",
    ),
});

export type RefinedScenario = z.infer<typeof refinedScenarioSchema>;

/**
 * Improves a learner-written scenario. The model always returns both fields; the caller applies only
 * the one being refined. Empty fields are generated from the other field.
 */
export function refineScenarioRequest(ctx: LearnerContext, input: { title: string; description: string; field: ScenarioField }): ChatRequest {
  return {
    system: [
      "You help an English learner write a role-play scenario for their AI English tutor.",
      learnerProfile(ctx),
      "",
      "Rewrite the scenario so the tutor knows exactly what to do:",
      "- Keep the learner's intent. Don't change the situation or add unrelated goals.",
      "- The input may be in English, Urdu or Roman Urdu; always write the output in natural English.",
      "- description: say who the tutor plays and the setting, what the tutor should ask or do, the tone (friendly, strict, formal…), and the learner's practice goal. Keep the difficulty suitable for the learner's level.",
      "- title: short and specific, e.g. 'Airport customs check', 'Asking my boss for a raise'.",
      "- If a field is empty, create it from the other field.",
      `- The learner asked to improve the ${input.field}; still return both fields (keep the other one close to the original if it is already good).`,
      "- Plain text only: no markdown, bullet points, quotes around the text, or emojis.",
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: `Title: ${input.title.trim() || "(empty)"}\nDescription: ${input.description.trim() || "(empty)"}`,
      },
    ],
    maxTokens: 1024,
  };
}
