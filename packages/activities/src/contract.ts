import type { ChatRequest } from "@repo/ai";
import type { ActivityResult, LearnerContext } from "@repo/core";
import type { ZodType } from "zod";
import type { AIRole } from "@repo/config";

/**
 * Every activity: builds a prompt for the learner, declares the structured output it expects,
 * and turns that output into a common ActivityResult.
 */
export interface Activity<Input, Output> {
  id: string;
  role: AIRole;
  schemaName: string;
  buildPrompt(ctx: LearnerContext, input: Input): ChatRequest;
  outputSchema: ZodType<Output>;
  evaluate(output: Output, ctx: LearnerContext): ActivityResult;
}
