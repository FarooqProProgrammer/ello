import { translationLanguage } from "@repo/core";
import { getActivitySession } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { voiceMode } from "@repo/voice/server";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEffectiveEnv } from "@/lib/ai-env";
import { ReadingView } from "./reading-view";

export default async function ReadingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const [session, env] = await Promise.all([getActivitySession(user.id, id, "reading"), getEffectiveEnv(user.id)]);
  const data = session?.data as { title: string; text: string; glossary: { term: string; definition: string; translation: string }[] } | null;
  if (!session || !data) notFound();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 lg:py-10">
      <Link href="/reading" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Reading
      </Link>
      <ReadingView
        sessionId={session.id}
        title={data.title}
        text={data.text}
        glossary={data.glossary}
        theme={session.topicId}
        voiceMode={voiceMode(env)}
        nativeLang={translationLanguage(user.nativeLanguage)}
      />
    </main>
  );
}
