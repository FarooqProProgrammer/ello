import { grammarLessonRequest, grammarLessonSchema } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { findGrammarTopic, recommendGrammarTopics } from "@repo/core";
import {
  getEffectiveEnv,
  getGrammarLesson,
  getGrammarProgress,
  getLearnerContext,
  getUserById,
  getWeakAreas,
  listUserIds,
  saveGrammarLesson,
} from "@repo/db";
import { inngest } from "../client";
import { EVENTS, lessonsPrewarmData } from "../events";

const TOPICS_PER_USER = 2;

/** Writes grammar lessons ahead of time for each learner's top recommended topics, so they open instantly. */
export const prewarmLessons = inngest.createFunction(
  {
    id: "prewarm-grammar-lessons",
    retries: 1,
    concurrency: { limit: 1 },
    triggers: [{ cron: "TZ=Asia/Karachi 0 4 * * *" }, { event: EVENTS.lessonsPrewarm }],
  },
  async ({ event, step }) => {
    const requested = lessonsPrewarmData.safeParse(event.data ?? {});
    const userIds = requested.success && requested.data.userId ? [requested.data.userId] : await step.run("list-users", () => listUserIds());
    const written: string[] = [];

    for (const userId of userIds) {
      const topicIds = await step.run(`pick-topics-${userId}`, async () => {
        const user = await getUserById(userId);
        if (!user?.placementCompleted) return [];
        const [progress, weakAreas] = await Promise.all([getGrammarProgress(userId), getWeakAreas(userId)]);
        const picks = recommendGrammarTopics(user.cefrLevel, weakAreas, progress, TOPICS_PER_USER);
        const missing: string[] = [];
        for (const { topic } of picks) {
          if (!(await getGrammarLesson(userId, topic.id, user.cefrLevel))) missing.push(topic.id);
        }
        return missing;
      });

      for (const topicId of topicIds) {
        await step.run(`write-lesson-${userId}-${topicId}`, async () => {
          const user = await getUserById(userId);
          const topic = findGrammarTopic(topicId);
          if (!user || !topic) return;
          const [ctx, env] = await Promise.all([getLearnerContext(userId), getEffectiveEnv(userId)]);
          const lesson = await getProvider("generator", env).structured(grammarLessonRequest(ctx, topic), grammarLessonSchema, "grammar_lesson");
          await saveGrammarLesson(userId, topic.id, user.cefrLevel, lesson);
        });
        written.push(`${userId}:${topicId}`);
      }
    }
    return { written };
  },
);
