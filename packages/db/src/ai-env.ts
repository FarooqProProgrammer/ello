import { applyOverrides, fillMissingRoutes, loadEnv, type Env } from "@repo/config";
import { loadAiOverrides } from "./ai-settings";

/**
 * .env values with the learner's Settings-page overrides layered on top.
 * Roles without a usable provider fall back to one that has credentials.
 * Shared by the web app and background jobs.
 */
export async function getEffectiveEnv(userId: string): Promise<Env> {
  const env = loadEnv();
  return fillMissingRoutes(applyOverrides(env, await loadAiOverrides(userId, env.APP_SECRET)));
}
