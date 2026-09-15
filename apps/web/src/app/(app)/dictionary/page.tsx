import { translationLanguage } from "@repo/core";
import { listVocab } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { voiceMode } from "@repo/voice/server";
import { getEffectiveEnv } from "@/lib/ai-env";
import { DictionaryView, type DictionaryEntry } from "./dictionary-view";

export default async function DictionaryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const user = await getCurrentUser();
  const [items, env] = await Promise.all([listVocab(user.id), getEffectiveEnv(user.id)]);

  const entries: DictionaryEntry[] = items.map((v) => ({
    id: v.id,
    term: v.term,
    partOfSpeech: v.partOfSpeech,
    definition: v.definition,
    translation: v.translation,
    usageNote: v.usageNote,
    usageNative: v.usageNative,
    example: v.example,
    source: v.source,
    state: v.state,
    due: v.due.toISOString(),
    createdAt: v.createdAt.toISOString(),
  }));

  return (
    <DictionaryView
      entries={entries}
      initialQuery={q ?? ""}
      nativeLang={translationLanguage(user.nativeLanguage)}
      voiceMode={voiceMode(env)}
    />
  );
}
