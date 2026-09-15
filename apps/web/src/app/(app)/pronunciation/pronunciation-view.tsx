"use client";

import type { TranslationLanguage, WordMatch } from "@repo/core";
import { Alert, Button, Card, CardTitle, Chip, cn } from "@repo/ui";
import { LoaderCircle, Mic, RotateCcw, Sparkles, Square, Volume2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { listenTurn, useSpeaker, type VoiceMode } from "@/components/voice";
import { postJson } from "@/lib/client";

interface Attempt {
  words: WordMatch[];
  score: number;
  heard: string;
  tips: { tips: { word: string; tip: string }[]; summary: string; summaryNative: string } | null;
}

export function PronunciationView({ voiceMode, setupMessage, nativeLang }: { voiceMode: VoiceMode; setupMessage: string | null; nativeLang: TranslationLanguage }) {
  const speaker = useSpeaker(voiceMode);
  const [sentences, setSentences] = useState<{ text: string; focus: string }[]>([]);
  const [target, setTarget] = useState("");
  const [loadingSentences, setLoadingSentences] = useState(false);
  const [state, setState] = useState<"idle" | "listening" | "scoring">("idle");
  const [interim, setInterim] = useState("");
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function loadSentences() {
    setLoadingSentences(true);
    setError(null);
    try {
      const { sentences } = await postJson<{ sentences: { text: string; focus: string }[] }>("/api/pronunciation/sentences", {});
      setSentences(sentences);
      if (sentences[0]) choose(sentences[0].text);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingSentences(false);
    }
  }

  function choose(text: string) {
    setTarget(text);
    setAttempt(null);
    setInterim("");
  }

  async function record() {
    if (state === "listening") {
      abortRef.current?.abort();
      return;
    }
    if (!target.trim()) return;
    speaker.stop();
    setError(null);
    setAttempt(null);
    setInterim("");
    setState("listening");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const heard = await listenTurn(voiceMode, { signal: controller.signal, onInterim: setInterim, pauseMs: 1600 });
      if (!heard.trim()) {
        setState("idle");
        if (!controller.signal.aborted) setError("I didn't hear anything. Tap the mic and read the sentence aloud.");
        return;
      }
      setState("scoring");
      const result = await postJson<Omit<Attempt, "heard">>("/api/pronunciation/attempt", { target, heard });
      setAttempt({ ...result, heard });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setState("idle");
    }
  }

  const native = cn(nativeLang.code === "ur" ? "font-urdu leading-[2.1]" : "");

  return (
    <>
      {setupMessage ? (
        <Alert tone="streak" action={<Link href="/settings" className="font-semibold text-primary">Settings →</Link>}>
          {setupMessage}
        </Alert>
      ) : null}

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Choose a sentence</CardTitle>
          <Button size="sm" variant="soft" onClick={loadSentences} loading={loadingSentences} disabled={setupMessage !== null}>
            <Sparkles className="size-4" /> {sentences.length ? "New sentences" : "Suggest sentences for me"}
          </Button>
        </div>
        {sentences.length ? (
          <ul className="flex flex-col gap-2">
            {sentences.map((s) => (
              <li key={s.text}>
                <button
                  type="button"
                  onClick={() => choose(s.text)}
                  className={cn("w-full rounded-xl border-2 px-3 py-2 text-left", target === s.text ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40")}
                >
                  <span className="block text-[16px]">{s.text}</span>
                  <span className="font-mono text-xs text-muted-foreground">{s.focus}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Or type your own</span>
          <input
            value={target}
            maxLength={300}
            onChange={(e) => choose(e.target.value)}
            placeholder="e.g. I think three things are worth thinking about."
            className="h-11 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary"
          />
        </label>
      </Card>

      {target.trim() ? (
        <Card className="flex flex-col items-center gap-4 py-8 text-center">
          <p className="font-display text-2xl font-bold leading-snug">
            {attempt
              ? attempt.words.map((w, i) => (
                  <span key={i} className={cn("mr-1.5", !w.ok && "mistake-mark")}>
                    {w.word}
                  </span>
                ))
              : target}
          </p>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="icon" onClick={() => speaker.play("target", target, { rate: 0.85 })} aria-label="Hear it">
              <Volume2 className="size-5" />
            </Button>
            <button
              type="button"
              onClick={record}
              disabled={state === "scoring"}
              className={cn(
                "relative grid size-20 place-items-center rounded-full text-white transition-transform active:scale-95",
                state === "listening" ? "bg-mistake" : "pressable bg-primary",
              )}
              aria-label={state === "listening" ? "Stop" : "Record"}
            >
              {state === "listening" ? <span className="absolute inset-0 animate-ping rounded-full bg-mistake/40" aria-hidden /> : null}
              {state === "scoring" ? <LoaderCircle className="size-8 animate-spin" /> : state === "listening" ? <Square className="relative size-7 fill-current" /> : <Mic className="size-8" />}
            </button>
            {attempt ? (
              <Button variant="secondary" size="icon" onClick={record} aria-label="Try again">
                <RotateCcw className="size-5" />
              </Button>
            ) : (
              <span className="size-10" />
            )}
          </div>
          <p className="min-h-6 text-sm text-muted-foreground">
            {state === "listening" ? interim || "Listening… read the sentence aloud" : state === "scoring" ? "Scoring…" : attempt ? `I heard: “${attempt.heard}”` : "Tap the mic and read the sentence"}
          </p>
          {attempt ? <Chip tone={attempt.score >= 90 ? "correct" : attempt.score >= 60 ? "highlight" : "mistake"} className="px-3 py-1.5 text-base">{attempt.score}% clear</Chip> : null}
        </Card>
      ) : null}

      {error ? <Alert>{error}</Alert> : null}

      {attempt?.tips ? (
        <Card className="flex flex-col gap-3">
          <CardTitle>Tips</CardTitle>
          <p>{attempt.tips.summary}</p>
          {attempt.tips.summaryNative ? (
            <p lang={nativeLang.code} dir={nativeLang.rtl ? "rtl" : "ltr"} className={cn("text-muted-foreground", native)}>
              {attempt.tips.summaryNative}
            </p>
          ) : null}
          <ul className="flex flex-col gap-2">
            {attempt.tips.tips.map((t) => (
              <li key={t.word} className="flex items-start gap-2 rounded-xl bg-muted px-3 py-2">
                <button type="button" onClick={() => speaker.play(`tip-${t.word}`, t.word, { rate: 0.75 })} className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-card" aria-label={`Hear ${t.word}`}>
                  <Volume2 className="size-4" />
                </button>
                <span>
                  <span className="font-semibold">{t.word}</span> — {t.tip}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}
