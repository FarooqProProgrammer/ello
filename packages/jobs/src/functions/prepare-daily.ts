import { getUserById, listUserIds } from "@repo/db";
import { inngest } from "../client";
import { ensureDailySet } from "../daily";

/** Prepares each learner's daily review before they wake up, so /daily opens instantly. */
export const prepareDailyReview = inngest.createFunction(
  {
    id: "prepare-daily-review",
    retries: 1,
    concurrency: { limit: 1 },
    triggers: [{ cron: "TZ=Asia/Karachi 30 4 * * *" }],
  },
  async ({ step }) => {
    const userIds = await step.run("list-users", () => listUserIds());
    const prepared: string[] = [];
    for (const userId of userIds) {
      const ok = await step.run(`prepare-${userId}`, async () => {
        const user = await getUserById(userId);
        if (!user?.placementCompleted) return false;
        await ensureDailySet(userId);
        return true;
      });
      if (ok) prepared.push(userId);
    }
    return { prepared };
  },
);
