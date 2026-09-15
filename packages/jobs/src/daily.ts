import { dailyReviewRequest, exerciseSetSchema, sanitizeExercises } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { recommendGrammarTopics } from "@repo/core";
import { createSession, findDailySession, getEffectiveEnv, getGrammarProgress, getLearnerContext, getUserById } from "@repo/db";

const TIME_ZONE = "Asia/Karachi";
const MIN_EXERCISES = 4;

/** Local calendar date (YYYY-MM-DD) used as the daily review's key. */
export function dailyKey(date = new Date(), timeZone = TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/**
 * Returns today's daily review session, generating it with the AI if needed.
 * Used by the overnight Inngest job and on demand by the /daily page.
 */
export async function ensureDailySet(userId: string) {
  const key = dailyKey();
  const existing = await findDailySession(userId, key);
  if (existing) return existing;

  const [user, ctx, env, progress] = await Promise.all([getUserById(userId), getLearnerContext(userId), getEffectiveEnv(userId), getGrammarProgress(userId)]);
  if (!user) throw new Error("User not found.");

  const topic = recommendGrammarTopics(user.cefrLevel, ctx.weakAreas, progress, 1)[0]?.topic ?? null;
  const provider = getProvider("generator", env);
  const generate = async () =>
    sanitizeExercises((await provider.structured(dailyReviewRequest(ctx, ctx.recentMistakes, topic), exerciseSetSchema, "daily_review")).exercises);

  let exercises = await generate();
  if (exercises.length < MIN_EXERCISES) exercises = await generate();
  if (exercises.length < MIN_EXERCISES) {
    throw new Error("The AI couldn't create a valid daily review. Try again, or choose a stronger model in Settings.");
  }

  return createSession(userId, "daily", key, { topicId: topic?.id ?? null, data: { exercises, answers: {} } });
}
