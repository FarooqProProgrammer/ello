import { memoryExtractionRequest, memoryExtractionSchema } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { acceptNewFacts } from "@repo/core";
import { addMemories, getEffectiveEnv, getSession, getUserById, listMemories, MEMORIES_IN_PROMPT } from "@repo/db";
import { inngest } from "../client";
import { EVENTS, messageAnalyzedData } from "../events";

/** Learns lasting facts about the learner from a graded chat message (ChatGPT-style memory). */
export const extractMemory = inngest.createFunction(
  {
    id: "extract-memory",
    retries: 2,
    concurrency: { limit: 2 },
    triggers: [{ event: EVENTS.messageAnalyzed }],
  },
  async ({ event, step }) => {
    const { userId, sessionId, messageId } = messageAnalyzedData.parse(event.data);

    const input = await step.run("load-message", async () => {
      const user = await getUserById(userId);
      if (!user?.memoryEnabled) return { skip: "memory disabled" as const };
      const session = await getSession(userId, sessionId);
      const index = session?.messages.findIndex((m) => m.id === messageId && m.role === "USER") ?? -1;
      if (!session || index === -1) return { skip: "message not found" as const };
      const previousTutor = session.messages
        .slice(0, index)
        .reverse()
        .find((m) => m.role === "ASSISTANT");
      const known = await listMemories(userId, MEMORIES_IN_PROMPT);
      return {
        skip: null,
        learnerMessage: session.messages[index]!.content,
        previousTutorMessage: previousTutor?.content,
        knownFacts: known.map((m) => m.fact),
      };
    });
    if (input.skip) return { skipped: input.skip };

    const facts = await step.run("extract-facts", async () => {
      const env = await getEffectiveEnv(userId);
      const { facts } = await getProvider("grader", env).structured(
        memoryExtractionRequest(input.knownFacts, input.learnerMessage, input.previousTutorMessage),
        memoryExtractionSchema,
        "memory_facts",
      );
      return acceptNewFacts(input.knownFacts, facts);
    });
    if (facts.length === 0) return { saved: [] };

    const saved = await step.run("save-facts", () => addMemories(userId, facts, "chat", { sessionId, messageId }));
    return { saved: saved.map((s) => s.fact) };
  },
);
