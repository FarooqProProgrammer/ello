"use client";

import type { TranslationLanguage } from "@repo/core";
import { Button, Card, CardTitle, Chip, cn } from "@repo/ui";
import { BookMarked, Check, Pause, Volume2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PracticeRunner, type PracticeStart } from "@/components/practice-runner";
import { useSpeaker, type VoiceMode } from "@/components/voice";
import { postJson } from "@/lib/client";

interface GlossaryItem {
  term: string;
  definition: string;
  translation: string;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Wraps glossary terms in the paragraph so they can be tapped. */
function markGlossary(paragraph: string, glossary: GlossaryItem[], onPick: (g: GlossaryItem) => void, active: string | null) {
  const terms = glossary.filter((g) => g.term.trim()).sort((a, b) => b.term.length - a.term.length);
  if (!terms.length) return paragraph;
  const regex = new RegExp(`\\b(${terms.map((t) => escapeRegExp(t.term)).join("|")})\\b`, "gi");
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of paragraph.matchAll(regex)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(paragraph.slice(last, index));
    const item = terms.find((t) => t.term.toLowerCase() === match[0].toLowerCase())!;
    parts.push(
      <button
        key={`${index}-${match[0]}`}
        type="button"
        onClick={() => onPick(item)}
        className={cn("highlighter rounded-sm px-0.5 font-semibold", active === item.term && "ring-2 ring-primary")}
      >
        {match[0]}
      </button>,
    );
    last = index + match[0].length;
  }
  if (last < paragraph.length) parts.push(paragraph.slice(last));
  return parts;
}

export function ReadingView({
  sessionId,
  title,
  text,
  glossary,
  theme,
  voiceMode,
  nativeLang,
}: {
  sessionId: string;
  title: string;
  text: string;
  glossary: GlossaryItem[];
  theme: string | null;
  voiceMode: VoiceMode;
  nativeLang: TranslationLanguage;
}) {
  const speaker = useSpeaker(voiceMode);
  const [picked, setPicked] = useState<GlossaryItem | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const paragraphs = useMemo(() => text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean), [text]);
  const native = cn(nativeLang.code === "ur" ? "font-urdu leading-[2.1]" : "");

  async function saveAll() {
    setSaving(true);
    try {
      await postJson("/api/vocab/bulk", {
        source: "reading",
        items: glossary.map((g) => ({ term: g.term, definition: g.definition, translation: g.translation, example: paragraphs.find((p) => p.toLowerCase().includes(g.term.toLowerCase()))?.slice(0, 380) ?? "" })),
      });
      setSaved(new Set(glossary.map((g) => g.term)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className="flex flex-col gap-2">
        {theme ? <Chip tone="primary" className="w-fit">{theme}</Chip> : null}
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => (speaker.playingId === "article" ? speaker.stop() : speaker.play("article", `${title}. ${text}`, { rate: 0.9 }))}
          >
            {speaker.playingId === "article" ? <Pause className="size-4" /> : <Volume2 className="size-4" />}
            {speaker.playingId === "article" ? "Stop" : "Listen"}
          </Button>
        </div>
      </header>

      <Card className="flex flex-col gap-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-[18px] leading-[1.9]">
            {markGlossary(p, glossary, setPicked, picked?.term ?? null)}
          </p>
        ))}
      </Card>

      {picked ? (
        <Card className="sticky bottom-24 z-20 flex items-start justify-between gap-3 border-primary/40 shadow-lg lg:bottom-4">
          <div className="min-w-0">
            <p className="highlighter font-display text-xl font-bold">{picked.term}</p>
            <p className="mt-1 text-sm">{picked.definition}</p>
            <p lang={nativeLang.code} dir={nativeLang.rtl ? "rtl" : "ltr"} className={cn("mt-1 text-lg font-semibold", native)}>
              {picked.translation}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setPicked(null)}>
            Close
          </Button>
        </Card>
      ) : null}

      {glossary.length ? (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Glossary</CardTitle>
            <Button size="sm" variant={saved.size === glossary.length ? "ghost" : "soft"} onClick={saveAll} loading={saving} disabled={saved.size === glossary.length}>
              {saved.size === glossary.length ? <Check className="size-4" /> : <BookMarked className="size-4" />}
              {saved.size === glossary.length ? "In dictionary" : "Add all to dictionary"}
            </Button>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {glossary.map((g) => (
              <li key={g.term} className="rounded-xl bg-muted px-3 py-2">
                <p className="font-semibold">{g.term}</p>
                <p className="text-sm text-muted-foreground">{g.definition}</p>
                <p lang={nativeLang.code} dir={nativeLang.rtl ? "rtl" : "ltr"} className={cn("text-[15px]", native)}>
                  {g.translation}
                </p>
              </li>
            ))}
          </ul>
          {saved.size ? (
            <Link href="/dictionary" className="text-sm font-semibold text-primary">
              Open dictionary →
            </Link>
          ) : null}
        </Card>
      ) : null}

      <PracticeRunner
        title="Check your understanding"
        description="Answer from the text. You can scroll up to read again."
        startLabel="Start questions"
        ready
        allowAgain={false}
        start={() => postJson<PracticeStart>(`/api/practice/${sessionId}/start`, {})}
        doneActions={
          <Link href="/reading">
            <Button variant="secondary">Read something new</Button>
          </Link>
        }
      />
    </>
  );
}
