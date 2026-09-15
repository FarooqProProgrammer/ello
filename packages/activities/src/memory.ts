import type { ChatRequest } from "@repo/ai";
import { z } from "zod";

export const memoryExtractionSchema = z.object({
  facts: z
    .array(z.string())
    .describe("0–2 NEW lasting facts about the learner, each one short third-person sentence; [] when there is nothing new"),
});

/** Asks the model for durable, non-sensitive facts the learner revealed in one message. */
export function memoryExtractionRequest(existingFacts: string[], learnerMessage: string, previousTutorMessage?: string): ChatRequest {
  return {
    system: [
      "You maintain a small memory about an English learner so their tutor can personalise future conversations.",
      "From the learner's latest message, extract at most 2 NEW facts that will still be useful weeks later:",
      "- job or studies, city/country, family situation, hobbies and interests, upcoming events or plans (include dates if given), learning goals and preferences.",
      "Do NOT save:",
      "- anything already in the known facts, small talk or temporary states (\"is tired today\"), facts about the tutor, role-play fiction the learner is only pretending,",
      "- sensitive details: health, religion, politics, sexuality, exact addresses, phone numbers, passwords, money amounts or other personal identifiers.",
      "Write each fact as a short third-person sentence without a subject, e.g. \"Works as a MERN stack developer\", \"Has a job interview on Friday\".",
      "Return an empty list when there is nothing worth remembering — that is the usual case.",
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: [
          `Known facts:\n${existingFacts.length ? existingFacts.map((f) => `- ${f}`).join("\n") : "(none)"}`,
          previousTutorMessage ? `Tutor said: """${previousTutorMessage}"""` : null,
          `Learner wrote: """${learnerMessage}"""`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
    maxTokens: 512,
  };
}
