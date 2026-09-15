import { z } from "zod";
import { inngest } from "./client";

export const EVENTS = {
  /** A learner chat message was graded → extract memory facts. */
  messageAnalyzed: "tutor/message.analyzed",
  /** Words were added to flashcards without full details → add translation and usage notes. */
  vocabAdded: "vocab/added",
  /** Write grammar lessons ahead of time for recommended topics. */
  lessonsPrewarm: "grammar/lessons.prewarm",
} as const;

export const messageAnalyzedData = z.object({
  userId: z.string(),
  sessionId: z.string(),
  messageId: z.string(),
});

export const vocabAddedData = z.object({
  userId: z.string(),
  terms: z.array(z.string()).min(1),
});

export const lessonsPrewarmData = z.object({
  userId: z.string().optional(),
});

interface EventData {
  [EVENTS.messageAnalyzed]: z.infer<typeof messageAnalyzedData>;
  [EVENTS.vocabAdded]: z.infer<typeof vocabAddedData>;
  [EVENTS.lessonsPrewarm]: z.infer<typeof lessonsPrewarmData>;
}

/**
 * Sends a background-job event. Never throws: if the Inngest dev server isn't running the app keeps
 * working and the job is simply skipped (a warning is logged).
 */
export async function emit<N extends keyof EventData>(name: N, data: EventData[N]): Promise<boolean> {
  try {
    await inngest.send({ name, data });
    return true;
  } catch (err) {
    console.warn(`[jobs] Could not send "${name}" — is the Inngest dev server running? ${(err as Error).message}`);
    return false;
  }
}
