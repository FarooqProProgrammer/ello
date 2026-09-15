"use client";

import { compareWords } from "@repo/core";
import { Button, Card, CardTitle, Chip, cn } from "@repo/ui";
import { Eye, EyeOff, Pause, Play, Volume2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { PracticeRunner, type PracticeStart } from "@/components/practice-runner";
import { useSpeaker, type VoiceMode } from "@/components/voice";
import { postJson } from "@/lib/client";

const RATES = [
  { value: 0.8, label: "Slow" },
  { value: 0.95, label: "Normal" },
  { value: 1.1, label: "Fast" },
];

export function ListeningView({
  sessionId,
  title,
  situation,
  lines,
  dictation,
  voiceMode,
}: {
  sessionId: string;
  title: string;
  situation: string;
  lines: { speaker: string; text: string }[];
  dictation: string[];
  voiceMode: VoiceMode;
}) {
  const speaker = useSpeaker(voiceMode);
  const [rate, setRate] = useState(0.95);
  const [current, setCurrent] = useState<number | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const playingRef = useRef(false);

  async function playAll() {
    if (playingRef.current) {
      playingRef.current = false;
      speaker.stop();
      setCurrent(null);
      return;
    }
    playingRef.current = true;
    for (let i = 0; i < lines.length && playingRef.current; i++) {
      setCurrent(i);
      await speaker.play(`line-${i}`, lines[i]!.text, { rate });
    }
    playingRef.current = false;
    setCurrent(null);
  }

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{situation}</p>
      </header>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={playAll} size="lg" className="w-auto">
            {current !== null ? <Pause className="size-5" /> : <Play className="size-5" />}
            {current !== null ? "Stop" : "Play dialogue"}
          </Button>
          <div className="flex gap-1" role="radiogroup" aria-label="Speed">
            {RATES.map((r) => (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={rate === r.value}
                onClick={() => setRate(r.value)}
                className={cn("rounded-full border px-3 py-1 text-sm font-semibold", rate === r.value ? "border-primary bg-primary-soft text-primary" : "border-border")}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowTranscript((s) => !s)}>
            {showTranscript ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {showTranscript ? "Hide transcript" : "Show transcript"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Tip: listen at least twice before looking at the transcript.</p>
        <ol className="flex flex-col gap-2">
          {lines.map((line, i) => (
            <li key={i} className={cn("flex items-start gap-3 rounded-xl px-3 py-2 transition-colors", current === i ? "bg-primary-soft" : "bg-muted/50")}>
              <span className="w-16 shrink-0 font-mono text-xs font-semibold text-muted-foreground">{line.speaker}</span>
              <span className={cn("flex-1 text-[16px]", !showTranscript && "select-none blur-sm")} aria-hidden={!showTranscript}>
                {line.text}
              </span>
              <button
                type="button"
                onClick={() => speaker.play(`line-${i}`, line.text, { rate })}
                className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-card"
                aria-label={`Play line ${i + 1}`}
              >
                <Volume2 className="size-4" />
              </button>
            </li>
          ))}
        </ol>
      </Card>

      <PracticeRunner
        title="Questions"
        description="Answer from what you heard."
        startLabel="Start questions"
        ready
        allowAgain={false}
        start={() => postJson<PracticeStart>(`/api/practice/${sessionId}/start`, {})}
      />

      {dictation.length ? <Dictation sentences={dictation} speaker={speaker} rate={rate} /> : null}

      <Link href="/listening" className="self-start">
        <Button variant="secondary">New listening task</Button>
      </Link>
    </>
  );
}

function Dictation({ sentences, speaker, rate }: { sentences: string[]; speaker: ReturnType<typeof useSpeaker>; rate: number }) {
  const [inputs, setInputs] = useState<string[]>(sentences.map(() => ""));
  const [checked, setChecked] = useState<boolean[]>(sentences.map(() => false));

  return (
    <Card className="flex flex-col gap-4">
      <CardTitle>Dictation</CardTitle>
      <p className="text-sm text-muted-foreground">Play each sentence and type exactly what you hear.</p>
      <ol className="flex flex-col gap-4">
        {sentences.map((sentence, i) => {
          const result = checked[i] ? compareWords(sentence, inputs[i] ?? "") : null;
          return (
            <li key={i} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button size="icon" variant="soft" onClick={() => speaker.play(`dict-${i}`, sentence, { rate })} aria-label={`Play sentence ${i + 1}`}>
                  <Volume2 className="size-4" />
                </Button>
                <input
                  value={inputs[i]}
                  disabled={checked[i]}
                  onChange={(e) => setInputs((all) => all.map((v, j) => (j === i ? e.target.value : v)))}
                  onKeyDown={(e) => e.key === "Enter" && inputs[i]?.trim() && setChecked((all) => all.map((v, j) => (j === i ? true : v)))}
                  placeholder={`Sentence ${i + 1}`}
                  aria-label={`Sentence ${i + 1}`}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary"
                />
                {!checked[i] ? (
                  <Button size="sm" disabled={!inputs[i]?.trim()} onClick={() => setChecked((all) => all.map((v, j) => (j === i ? true : v)))}>
                    Check
                  </Button>
                ) : (
                  <Chip tone={result!.score >= 90 ? "correct" : result!.score >= 60 ? "highlight" : "mistake"}>{result!.score}%</Chip>
                )}
              </div>
              {result ? (
                <p className="pl-12 text-[15px] leading-relaxed">
                  {result.words.map((w, j) => (
                    <span key={j} className={cn("mr-1", !w.ok && "rounded bg-mistake-soft px-0.5 underline decoration-mistake decoration-wavy")}>
                      {w.word}
                    </span>
                  ))}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
