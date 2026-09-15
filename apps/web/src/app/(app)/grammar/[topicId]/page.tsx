import type { GrammarLesson } from "@repo/activities";
import { findGrammarTopic } from "@repo/core";
import { getGrammarLesson, getGrammarProgress } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { voiceMode } from "@repo/voice/server";
import { notFound } from "next/navigation";
import { getEffectiveEnv } from "@/lib/ai-env";
import { translationLanguage } from "@/lib/labels";
import { setupMessageFor } from "../../tutor/data";
import { GrammarTopicView } from "./grammar-topic";

export default async function GrammarTopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const topic = findGrammarTopic(topicId);
  if (!topic) notFound();

  const user = await getCurrentUser();
  const [lesson, progress, env] = await Promise.all([
    getGrammarLesson(user.id, topic.id, user.cefrLevel),
    getGrammarProgress(user.id),
    getEffectiveEnv(user.id),
  ]);
  const p = progress[topic.id];

  return (
    <GrammarTopicView
      topic={topic}
      learnerLevel={user.cefrLevel}
      initialLesson={(lesson as GrammarLesson | null) ?? null}
      mastery={p?.attempts ? p.mastery : null}
      voiceMode={voiceMode(env)}
      setupMessage={setupMessageFor(env)}
      nativeLang={user.explainInNative && user.nativeLanguage ? translationLanguage(user.nativeLanguage) : null}
    />
  );
}
