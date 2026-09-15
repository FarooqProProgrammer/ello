"use client";

import type { IdiomPack } from "@repo/activities";
import type { TranslationLanguage } from "@repo/core";
import { Button, Card, cn } from "@repo/ui";
import { BookMarked, Check, Volume2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PracticeRunner, type PracticeStart } from "@/components/practice-runner";
import { useSpeaker, type VoiceMode } from "@/components/voice";
import { postJson } from "@/lib/client";

type Item = IdiomPack["items"][number];

export function IdiomPackView({
  sessionId,
  title,
  items,
  initiallySaved,
  voiceMode,
  nativeLang,
}: {
  sessionId: string;
  title: string;
  items: Item[];
  initiallySaved: string[];
  voiceMode: VoiceMode;
  nativeLang: TranslationLanguage;
}) {
  const speaker = useSpeaker(voiceMode);
  const [saved, setSaved] = useState(new Set(initiallySaved));
  const [saving, setSaving] = useState<string | null>(null);
  const native = cn(nativeLang.code === "ur" ? "font-urdu leading-[2.1]" : "");

  async function save(list: Item[], key: string) {
    setSaving(key);
    try {
      await postJson("/api/vocab/bulk", {
        source: "idioms",
        items: list.map((i) => ({ term: i.term, definition: i.meaning, translation: i.translation, example: i.example, usageNote: i.usage, partOfSpeech: "expression" })),
      });
      setSaved((prev) => new Set([...prev, ...list.map((i) => i.term)]));
    } finally {
      setSaving(null);
    }
  }

  const allSaved = items.every((i) => saved.has(i.term));

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
        <Button variant={allSaved ? "ghost" : "soft"} onClick={() => save(items, "all")} loading={saving === "all"} disabled={allSaved}>
          {allSaved ? <Check className="size-4" /> : <BookMarked className="size-4" />}
          {allSaved ? "All in dictionary" : "Add all to dictionary"}
        </Button>
      </header>

      <ul className="grid gap-3 md:grid-cols-2">
        {items.map((item) => {
          const isSaved = saved.has(item.term);
          return (
            <li key={item.term}>
              <Card className="flex h-full flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="highlighter font-display text-xl font-bold">{item.term}</p>
                  <button
                    type="button"
                    onClick={() => speaker.play(item.term, `${item.term}. ${item.example}`, { rate: 0.9 })}
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"
                    aria-label={`Hear ${item.term}`}
                  >
                    <Volume2 className="size-4" />
                  </button>
                </div>
                <p className="text-[15px]">{item.meaning}</p>
                <p lang={nativeLang.code} dir={nativeLang.rtl ? "rtl" : "ltr"} className={cn("text-lg font-semibold", native)}>
                  {item.translation}
                </p>
                <p className="border-l-4 border-l-highlight pl-3 text-sm italic">“{item.example}”</p>
                <p className="text-xs text-muted-foreground">{item.usage}</p>
                <Button size="sm" variant={isSaved ? "ghost" : "secondary"} className="mt-auto self-start" onClick={() => save([item], item.term)} loading={saving === item.term} disabled={isSaved}>
                  {isSaved ? <Check className="size-4" /> : <BookMarked className="size-4" />}
                  {isSaved ? "In dictionary" : "Add to dictionary"}
                </Button>
              </Card>
            </li>
          );
        })}
      </ul>

      <PracticeRunner
        title="Quiz"
        description="Use the expressions you just learned."
        startLabel="Start quiz"
        ready
        allowAgain={false}
        start={() => postJson<PracticeStart>(`/api/practice/${sessionId}/start`, {})}
        doneActions={
          <Link href="/idioms">
            <Button variant="secondary">New pack</Button>
          </Link>
        }
      />
    </>
  );
}
