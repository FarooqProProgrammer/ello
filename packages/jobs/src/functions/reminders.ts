import { halfHourSlot, localClock } from "@repo/core";
import { currentStreak, getUserById, listReminderUserIds, markReminded, practisedToday } from "@repo/db";
import { inngest } from "../client";
import { pushConfigured, sendPushToUser, type PushPayload } from "../push";

const AT_RISK_SLOT = "21:00";
const MIN_GAP_MS = 50 * 60 * 1000;

/**
 * Every 30 minutes: at each learner's reminder time (if they haven't practised today) send a reminder,
 * and at 21:00 nudge learners whose streak is at risk.
 */
export const dailyReminders = inngest.createFunction(
  {
    id: "daily-reminders",
    retries: 1,
    concurrency: { limit: 1 },
    triggers: [{ cron: "*/30 * * * *" }],
  },
  async ({ step }) => {
    if (!pushConfigured()) return { skipped: "VAPID keys are not set (run pnpm vapid)" };
    const userIds = await step.run("list-reminder-users", () => listReminderUserIds());
    const sent: string[] = [];

    for (const userId of userIds) {
      const result = await step.run(`remind-${userId}`, async () => {
        const user = await getUserById(userId);
        if (!user?.reminderEnabled) return null;
        const now = new Date();
        if (user.lastReminderAt && now.getTime() - user.lastReminderAt.getTime() < MIN_GAP_MS) return null;
        if (await practisedToday(userId, user.timeZone, now)) return null;

        const slot = halfHourSlot(localClock(now, user.timeZone).hhmm);
        const streak = await currentStreak(userId, now);
        let payload: PushPayload | null = null;
        if (slot === user.reminderTime) {
          payload = {
            title: "Time for English 📚",
            body: streak > 0 ? `Keep your ${streak}-day streak going — 5 minutes is enough.` : "A 5-minute daily review keeps your English growing.",
            url: "/daily",
          };
        } else if (slot === AT_RISK_SLOT && streak > 0) {
          payload = { title: `Your ${streak}-day streak is at risk 🔥`, body: "Do a quick flashcard review before midnight.", url: "/review" };
        }
        if (!payload) return null;

        const delivered = await sendPushToUser(userId, payload);
        if (delivered) await markReminded(userId, now);
        return delivered ? slot : null;
      });
      if (result) sent.push(`${userId}@${result}`);
    }
    return { sent };
  },
);
