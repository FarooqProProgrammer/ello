import { weeklyReportRequest, weeklyReportSchema } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { isoWeekKey, translationLanguage } from "@repo/core";
import { createSession, findSessionByTitle, getEffectiveEnv, getLearnerContext, getUserById, updateSessionData, weeklyStats } from "@repo/db";

export const REPORT_ACTIVITY = "weekly-report";

/** Writes (or refreshes with `force`) this week's AI progress report. Used by the Sunday job and the Reports page. */
export async function generateWeeklyReport(userId: string, { force = false } = {}) {
  const key = isoWeekKey();
  const existing = await findSessionByTitle(userId, REPORT_ACTIVITY, key);
  if (existing && !force) return existing;

  const [user, ctx, env, stats] = await Promise.all([getUserById(userId), getLearnerContext(userId), getEffectiveEnv(userId), weeklyStats(userId)]);
  if (!user) throw new Error("User not found.");

  const report = await getProvider("generator", env).structured(
    weeklyReportRequest(ctx, stats, translationLanguage(user.nativeLanguage).name),
    weeklyReportSchema,
    "weekly_report",
  );
  const data = { stats, report };

  if (existing) {
    await updateSessionData(existing.id, data);
    return { ...existing, data };
  }
  return createSession(userId, REPORT_ACTIVITY, key, { data });
}
