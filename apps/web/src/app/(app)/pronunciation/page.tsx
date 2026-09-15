import { translationLanguage } from "@repo/core";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { voiceMode } from "@repo/voice/server";
import { AudioLines } from "lucide-react";
import { getEffectiveEnv } from "@/lib/ai-env";
import { setupMessageFor } from "../tutor/data";
import { PronunciationView } from "./pronunciation-view";

export default async function PronunciationPage() {
  const user = await getCurrentUser();
  const env = await getEffectiveEnv(user.id);
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 lg:py-10">
      <header>
        <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
          <AudioLines className="size-7 text-primary" /> Pronunciation
        </h1>
        <p className="mt-1 text-muted-foreground">
          Say a sentence out loud. Words the speech recogniser couldn&apos;t understand are highlighted, with tips to fix them.
        </p>
      </header>
      <PronunciationView voiceMode={voiceMode(env)} setupMessage={setupMessageFor(env)} nativeLang={translationLanguage(user.nativeLanguage)} />
    </main>
  );
}
