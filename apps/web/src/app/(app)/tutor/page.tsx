import { adaptiveDifficulty } from "@repo/core";
import { recentMessageScores } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { voiceMode } from "@repo/voice/server";
import { getEffectiveEnv } from "@/lib/ai-env";
import { chatSummaries, customScenarios, isKnownTopic, setupMessageFor, topicOptions, translationLanguage } from "./data";
import { TutorChat } from "./tutor-chat";

export default async function TutorPage({ searchParams }: { searchParams: Promise<{ topic?: string; focus?: string }> }) {
  const { topic, focus } = await searchParams;
  const user = await getCurrentUser();
  const [env, chats, scenarios, scores] = await Promise.all([
    getEffectiveEnv(user.id),
    chatSummaries(user.id),
    customScenarios(user.id),
    recentMessageScores(user.id),
  ]);

  return (
    <TutorChat
      key={`new-${topic ?? ""}-${focus ?? ""}`}
      level={user.cefrLevel}
      topics={topicOptions}
      customScenarios={scenarios}
      initialTopic={isKnownTopic(topic, scenarios) ? topic : null}
      focus={focus ?? null}
      voiceMode={voiceMode(env)}
      voiceReplies={user.voiceEnabled}
      setupMessage={setupMessageFor(env)}
      chats={chats}
      initialChat={null}
      translationLang={translationLanguage(user.nativeLanguage)}
      difficulty={adaptiveDifficulty(scores).mode}
    />
  );
}
