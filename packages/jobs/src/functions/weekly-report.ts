import { getUserById, listUserIds } from "@repo/db";
import { inngest } from "../client";
import { generateWeeklyReport } from "../weekly-report";

/** Every Sunday morning: an AI-written weekly progress report for each learner. */
export const weeklyReport = inngest.createFunction(
  {
    id: "weekly-progress-report",
    retries: 2,
    concurrency: { limit: 1 },
    triggers: [{ cron: "TZ=Asia/Karachi 0 9 * * 0" }],
  },
  async ({ step }) => {
    const userIds = await step.run("list-users", () => listUserIds());
    const written: string[] = [];
    for (const userId of userIds) {
      const ok = await step.run(`report-${userId}`, async () => {
        const user = await getUserById(userId);
        if (!user?.placementCompleted) return false;
        await generateWeeklyReport(userId);
        return true;
      });
      if (ok) written.push(userId);
    }
    return { written };
  },
);
