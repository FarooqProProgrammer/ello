"use client";

import type { IeltsFeedback, IeltsQuestions } from "@repo/activities";
import { Alert, Button, Card, CardTitle, Chip, cn, ProgressBar } from "@repo/ui";
import { ArrowRight, Mic, RotateCcw, Square, Volume2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { listenTurn, useSpeaker, type VoiceMode } from "@/components/voice";
import { postJson } from "@/lib/client";

interface Step {
  part: 1 | 2 | 3;
  question: string;
  bullets?: string[];
}

function stepsFor(q: IeltsQuestions): Step[] {
  return [
    ...q.part1.map((question) => ({ part: 1 as const, question })),
    { part: 2 as const, question: q.part2.topic, bullets: q.part2.bullets },
    ...q.part3.map((question) => ({ part: 3 as const, question })),
  ];
}

export function SpeakingTest({
  voiceMode,
  existing,
}: {
  voiceMode: VoiceMode;
  existing: { id: string; questions: IeltsQuestions; answers: { part: number; question: string; answer: string }[]; feedback: IeltsFeedback | null } | null;
}) {
  const speaker = useSpeaker(voiceMode);
  const [testId, setTestId] = useState(existing?.id ?? null);
  const [questions, setQuestions] = useState<IeltsQuestions | null>(existing?.questions ?? null);
  const steps = useMemo(() => (questions ? stepsFor(questions) : []), [questions]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(existing?.answers.map((a) => a.answer) ?? []);
  const [feedback, setFeedback] = useState<IeltsFeedback | null>(existing?.feedback ?? null);
  const [busy, setBusy] = useState<"start" | "finish" | null>(null);
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const step = steps[index];

  async function start() {
    setBusy("start");
    setError(null);
    try {
      const res = await postJson<{ id: string; questions: IeltsQuestions }>("/api/ielts/speaking", {}, "POST", { retries: 0 });
      setTestId(res.id);
      setQuestions(res.questions);
      setAnswers([]);
      setIndex(0);
      window.history.replaceState(null, "", `/ielts/speaking?id=${res.id}`);
      const first = stepsFor(res.questions)[0];
      if (first) void speaker.play("q-0", first.question);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function record() {
    if (recording) {
      abortRef.current?.abort();
      return;
    }
    speaker.stop();
    setError(null);
    setRecording(true);
    setInterim("");
    const controller = new AbortController();
    abortRef.current = controller;
    const isLong = step?.part === 2;
    try {
      const heard = await listenTurn(voiceMode, {
        signal: controller.signal,
        onInterim: setInterim,
        pauseMs: isLong ? 3500 : 2200,
        noSpeechMs: 12000,
      });
      if (heard.trim()) setAnswers((all) => {
        const next = [...all];
        next[index] = [next[index], heard.trim()].filter(Boolean).join(" ");
        return next;
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRecording(false);
      setInterim("");
    }
  }

  function goNext() {
    if (index + 1 < steps.length) {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      void speaker.play(`q-${nextIndex}`, steps[nextIndex]!.question);
    } else {
      void finish();
    }
  }

  async function finish() {
    if (!testId) return;
    setBusy("finish");
    setError(null);
    try {
      const res = await postJson<{ feedback: IeltsFeedback }>(`/api/ielts/speaking/${testId}/finish`, {
        answers: steps.map((s, i) => ({ part: s.part, question: s.question, answer: answers[i] ?? "" })),
      });
      setFeedback(res.feedback);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (feedback) return <FeedbackReport feedback={feedback} />;

  if (!questions) {
    return (
      <Card className="flex flex-col items-start gap-3">
        <CardTitle className="text-2xl">IELTS Speaking mock test</CardTitle>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Part 1: 4 short questions about you</li>
          <li>Part 2: a cue card — speak for 1–2 minutes</li>
          <li>Part 3: 3 deeper discussion questions</li>
        </ul>
        <p className="text-sm text-muted-foreground">The examiner reads each question aloud. Answer with the mic (or type), then continue.</p>
        {error ? <Alert className="w-full">{error}</Alert> : null}
        <Button onClick={start} loading={busy === "start"}>
          Start the test
        </Button>
      </Card>
    );
  }

  if (!step) return null;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Chip tone="primary">Part {step.part}</Chip>
        <ProgressBar value={(index / steps.length) * 100} label="Test progress" />
        <span className="font-mono text-sm text-muted-foreground">
          {index + 1}/{steps.length}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <button type="button" onClick={() => speaker.play(`q-${index}`, step.question)} className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary" aria-label="Hear the question">
          <Volume2 className="size-5" />
        </button>
        <div>
          <p className="font-display text-2xl font-bold leading-snug">{step.question}</p>
          {step.bullets?.length ? (
            <div className="mt-2 rounded-xl border border-highlight bg-highlight-soft p-3">
              <p className="text-sm font-semibold">You should say:</p>
              <ul className="list-disc pl-5 text-sm">
                {step.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">Take a moment to plan, then speak for 1–2 minutes.</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={record}
            className={cn("relative grid size-14 shrink-0 place-items-center rounded-full text-white", recording ? "bg-mistake" : "pressable bg-primary")}
            aria-label={recording ? "Stop recording" : "Answer by voice"}
          >
            {recording ? <span className="absolute inset-0 animate-ping rounded-full bg-mistake/40" aria-hidden /> : null}
            {recording ? <Square className="relative size-6 fill-current" /> : <Mic className="size-6" />}
          </button>
          <p className="text-sm text-muted-foreground">{recording ? interim || "Listening… speak your answer" : "Tap to answer by voice, or type below."}</p>
        </div>
        <textarea
          value={answers[index] ?? ""}
          onChange={(e) => setAnswers((all) => {
            const next = [...all];
            next[index] = e.target.value;
            return next;
          })}
          rows={step.part === 2 ? 6 : 3}
          placeholder="Your answer (transcribed speech appears here — you can edit it)"
          aria-label="Your answer"
          className="rounded-xl border border-border bg-background px-3 py-2 text-[16px] leading-relaxed outline-none focus:border-primary"
        />
      </div>

      {error ? <Alert action={busy === null && index + 1 >= steps.length ? <Button size="sm" variant="secondary" onClick={finish}><RotateCcw className="size-4" /> Retry</Button> : null}>{error}</Alert> : null}

      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0 || busy !== null}>
          Back
        </Button>
        <Button onClick={goNext} loading={busy === "finish"} disabled={recording}>
          {busy === "finish" ? "Examiner is scoring…" : index + 1 < steps.length ? (
            <>
              Next <ArrowRight className="size-4" />
            </>
          ) : (
            "Finish & get my band"
          )}
        </Button>
      </div>
    </Card>
  );
}

function FeedbackReport({ feedback }: { feedback: IeltsFeedback }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center gap-5">
        <div className="grid size-24 place-items-center rounded-full border-4 border-primary bg-primary-soft">
          <span className="text-center">
            <span className="block font-display text-3xl font-extrabold leading-none">{feedback.overallBand}</span>
            <span className="text-[11px] font-semibold text-muted-foreground">band</span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold">Speaking result</h1>
          <p className="mt-1 leading-relaxed">{feedback.summary}</p>
        </div>
      </Card>
      <Card className="grid gap-3 sm:grid-cols-2">
        {feedback.criteria.map((c) => (
          <div key={c.name} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span className="font-semibold">{c.name}</span>
              <span className="font-mono">{c.band}</span>
            </div>
            <ProgressBar value={(c.band / 9) * 100} label={c.name} />
            <p className="text-xs text-muted-foreground">{c.comment}</p>
          </div>
        ))}
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle className="mb-2">Strengths</CardTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm">{feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </Card>
        <Card>
          <CardTitle className="mb-2">To reach a higher band</CardTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm">{feedback.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </Card>
      </div>
      {feedback.corrections.length ? (
        <Card className="flex flex-col gap-2">
          <CardTitle>Corrections</CardTitle>
          {feedback.corrections.map((c, i) => (
            <p key={i} className="text-sm">
              <span className="rounded bg-mistake-soft px-1.5 line-through decoration-mistake">{c.original}</span> →{" "}
              <span className="rounded bg-correct-soft px-1.5 font-semibold">{c.corrected}</span>
              <span className="text-muted-foreground"> — {c.explanation}</span>
            </p>
          ))}
        </Card>
      ) : null}
      {feedback.betterAnswers.length ? (
        <Card className="flex flex-col gap-3">
          <CardTitle>Model answers</CardTitle>
          {feedback.betterAnswers.map((b, i) => (
            <div key={i}>
              <p className="text-sm font-semibold">{b.question}</p>
              <p className="mt-1 rounded-xl bg-muted p-3 text-[15px] leading-relaxed">{b.answer}</p>
            </div>
          ))}
        </Card>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Link href="/ielts/speaking">
          <Button>New speaking test</Button>
        </Link>
        <Link href="/mistakes">
          <Button variant="secondary">Practise these mistakes</Button>
        </Link>
      </div>
    </div>
  );
}
