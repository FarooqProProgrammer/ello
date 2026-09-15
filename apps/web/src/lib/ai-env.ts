import { consumeAiRequest, db, getEffectiveEnv } from "@repo/db";
import type { Env } from "@repo/config";
import { HttpError } from "./api";
import { authEnabled } from "./auth";

/** Settings-only lookups (pages showing setup status) — never counted against the daily limit. */
export { getEffectiveEnv };

export function dailyAiLimit(plan: string): number {
  const free = Number(process.env.FREE_DAILY_AI_REQUESTS) || 150;
  const pro = Number(process.env.PRO_DAILY_AI_REQUESTS) || 2000;
  return plan === "pro" ? pro : free;
}

/**
 * AI settings for a request that is about to call a model. With accounts on, this counts the request
 * toward the learner's daily plan limit and refuses once it's used up.
 */
export async function aiEnvFor(userId: string): Promise<Env> {
  if (authEnabled()) {
    const user = await db().user.findUnique({ where: { id: userId }, select: { plan: true } });
    const limit = dailyAiLimit(user?.plan ?? "free");
    const used = await consumeAiRequest(userId);
    if (used > limit) {
      throw new HttpError(
        429,
        user?.plan === "pro"
          ? "You've reached today's AI limit. It resets at midnight UTC."
          : `You've used today's ${limit} free AI requests. Upgrade to Pro on the Billing page, or come back tomorrow.`,
        "quota_exceeded",
      );
    }
  }
  return getEffectiveEnv(userId);
}
