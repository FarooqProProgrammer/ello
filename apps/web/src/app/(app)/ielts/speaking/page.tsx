import type { IeltsFeedback, IeltsQuestions } from "@repo/activities";
import { getActivitySession } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { voiceMode } from "@repo/voice/server";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { getEffectiveEnv } from "@/lib/ai-env";
import { SpeakingTest } from "./speaking-test";

export default async function IeltsSpeakingPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const user = await getCurrentUser();
  const [session, env] = await Promise.all([id ? getActivitySession(user.id, id, "ielts-speaking") : null, getEffectiveEnv(user.id)]);
  const data = session?.data as { questions: IeltsQuestions; answers?: { part: number; question: string; answer: string }[]; feedback?: IeltsFeedback } | null;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 lg:py-10">
      <Link href="/ielts" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> IELTS
      </Link>
      <SpeakingTest
        voiceMode={voiceMode(env)}
        existing={session && data ? { id: session.id, questions: data.questions, answers: data.answers ?? [], feedback: data.feedback ?? null } : null}
      />
    </main>
  );
}
