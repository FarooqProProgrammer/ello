import type { ReplyExplanation } from "@repo/activities";
import { adaptiveDifficulty } from "@repo/core";
import { getSession, memoriesByMessage, recentMessageScores } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { voiceMode } from "@repo/voice/server";
import { notFound } from "next/navigation";
import { getEffectiveEnv } from "@/lib/ai-env";
import { chatSummaries, setupMessageFor, topicOptions, translationLanguage } from "../data";
import { TutorChat, type InitialChat } from "../tutor-chat";

/** Reopens a saved tutor chat with its full history and feedback. */
export default async function TutorChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  const user = await getCurrentUser();
  const [session, env, chats, remembered, scores] = await Promise.all([
    getSession(user.id, chatId),
    getEffectiveEnv(user.id),
    chatSummaries(user.id),
    memoriesByMessage(user.id, { sessionId: chatId }),
    recentMessageScores(user.id),
  ]);
  if (!session || session.activityId !== "tutor-chat") notFound();
  const nativeLang = translationLanguage(user.nativeLanguage);

  const initialChat: InitialChat = {
    id: session.id,
    title: session.title,
    topicId: session.topicId ?? "free",
    focus: session.focus,
    items: session.messages.map((m) => {
      type Analysis = NonNullable<InitialChat["items"][number]["analysis"]>;
      const saved = m.analysis as Omit<Analysis, "status"> | null;
      // Messages graded before feedback was stored still have their mistake rows.
      const fromMistakes: Analysis | undefined = m.mistakes.length
        ? {
            status: "done",
            corrections: m.mistakes.map((x) => ({
              type: x.type,
              category: x.category,
              original: x.original,
              corrected: x.corrected,
              explanation: x.explanation,
            })),
            newWords: [],
          }
        : undefined;
      const base: Analysis | undefined = saved ? { ...saved, status: "done" } : fromMistakes;
      const facts = remembered.get(m.id);
      const analysis: Analysis | undefined = base && facts ? { ...base, memorySaved: facts } : base;
      return {
        id: m.id,
        role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: m.content,
        // Skip saved translations in the wrong script (e.g. Roman Urdu) so the chat fetches a fresh one.
        ...(m.translation && (!nativeLang.rtl || /[؀-ۿ]/.test(m.translation)) ? { translation: m.translation } : {}),
        ...(m.role === "USER" && analysis ? { analysis } : {}),
        ...(m.role === "ASSISTANT" && m.explanation ? { explanation: { status: "done" as const, data: m.explanation as unknown as ReplyExplanation } } : {}),
      };
    }),
  };

  return (
    <TutorChat
      key={session.id}
      level={user.cefrLevel}
      topics={topicOptions}
      customScenarios={[]}
      initialTopic={null}
      focus={session.focus}
      voiceMode={voiceMode(env)}
      voiceReplies={user.voiceEnabled}
      setupMessage={setupMessageFor(env)}
      chats={chats}
      initialChat={initialChat}
      translationLang={translationLanguage(user.nativeLanguage)}
      difficulty={adaptiveDifficulty(scores).mode}
    />
  );
}
