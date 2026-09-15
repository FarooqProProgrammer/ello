import { enrichVocab } from "./enrich-vocab";
import { extractMemory } from "./extract-memory";
import { prepareDailyReview } from "./prepare-daily";
import { prewarmLessons } from "./prewarm-lessons";
import { dailyReminders } from "./reminders";
import { weeklyReport } from "./weekly-report";

/** Every background function, registered with Inngest by apps/web/src/app/api/inngest/route.ts. */
export const functions = [extractMemory, enrichVocab, prewarmLessons, prepareDailyReview, weeklyReport, dailyReminders];
