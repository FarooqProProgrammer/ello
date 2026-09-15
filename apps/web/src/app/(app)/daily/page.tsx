import { findGrammarTopic } from "@repo/core";
import { countDueVocab, findDailySession } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { dailyKey } from "@repo/jobs";
import { getEffectiveEnv } from "@/lib/ai-env";
import { setupMessageFor } from "../tutor/data";
import { DailyView } from "./daily-view";

export default async function DailyPage() {
  const user = await getCurrentUser();
  const key = dailyKey();
  const [due, session, env] = await Promise.all([countDueVocab(user.id), findDailySession(user.id, key), getEffectiveEnv(user.id)]);
  const topic = session?.topicId ? findGrammarTopic(session.topicId) : null;

  return (
    <DailyView
      dateLabel={new Date(`${key}T12:00:00`).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
      dueCount={due}
      prepared={Boolean(session)}
      finished={Boolean(session?.endedAt)}
      score={session?.score ?? null}
      focusTopic={topic ? { id: topic.id, title: topic.title.replace(/[“”]/g, "") } : null}
      setupMessage={setupMessageFor(env)}
    />
  );
}
