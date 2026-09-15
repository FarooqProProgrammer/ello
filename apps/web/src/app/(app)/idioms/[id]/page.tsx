import type { IdiomPack } from "@repo/activities";
import { translationLanguage } from "@repo/core";
import { getActivitySession, listVocab } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { voiceMode } from "@repo/voice/server";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEffectiveEnv } from "@/lib/ai-env";
import { IdiomPackView } from "./idiom-pack-view";

export default async function IdiomPackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const [session, env, vocab] = await Promise.all([getActivitySession(user.id, id, "idioms"), getEffectiveEnv(user.id), listVocab(user.id)]);
  const data = session?.data as { theme: string; items: IdiomPack["items"] } | null;
  if (!session || !data) notFound();
  const known = new Set(vocab.map((v) => v.term));

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 lg:py-10">
      <Link href="/idioms" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Idioms & phrasal verbs
      </Link>
      <IdiomPackView
        sessionId={session.id}
        title={session.title ?? data.theme}
        items={data.items}
        initiallySaved={data.items.filter((i) => known.has(i.term.trim().toLowerCase())).map((i) => i.term)}
        voiceMode={voiceMode(env)}
        nativeLang={translationLanguage(user.nativeLanguage)}
      />
    </main>
  );
}
