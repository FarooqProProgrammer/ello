import { getProvider } from "@repo/ai";
import type { Env } from "@repo/config";
import type { ActivityResult, LearnerContext } from "@repo/core";
import type { Activity } from "./contract";

/** Runs a structured activity end-to-end with the provider configured for its role. */
export async function runActivity<Input, Output>(
  activity: Activity<Input, Output>,
  ctx: LearnerContext,
  input: Input,
  env?: Env,
): Promise<{ output: Output; result: ActivityResult }> {
  const provider = getProvider(activity.role, env);
  const output = await provider.structured(activity.buildPrompt(ctx, input), activity.outputSchema, activity.schemaName);
  return { output, result: activity.evaluate(output, ctx) };
}
