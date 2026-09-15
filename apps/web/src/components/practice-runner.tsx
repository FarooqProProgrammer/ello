"use client";

import type { PublicExercise } from "@repo/activities";
import { Alert, Button, Card, CardTitle, Chip, cn, ProgressBar } from "@repo/ui";
import { ArrowRight, Check, RotateCcw, Trophy, X } from "lucide-react";
import { useEffect, useState } from "react";
import { postJson } from "@/lib/client";

export interface CheckResult {
  given: string;
  correct: boolean;
  feedback: string;
  correctAnswer: string;
  explanation: string;
}

export interface FinishResult {
  score: number | null;
  correct: number;
  total: number;
  mastery: number | null;
}

export interface PracticeStart {
  sessionId: string;
  exercises: PublicExercise[];
  /** Saved answers, to resume a session. */
  answered?: Record<string, CheckResult>;
  finished?: boolean;
  score?: number | null;
}

const INSTRUCTIONS: Record<PublicExercise["type"], string> = {
  question: "Answer the question",
  multiple_choice: "Choose the correct option",
  fill_blank: "Type the missing word(s)",
  correct_sentence: "Fix the mistake",
  reorder: "Put the words in order",
};

/**
 * Runs an AI exercise set (grammar practice, daily review): one question at a time, server-checked answers,
 * results summary. Answers/finish go through /api/grammar/practice/:sessionId/*.
 */
export function PracticeRunner({
  title,
  description,
  startLabel = "Start practice",
  ready,
  start,
  onFinished,
  showMastery = false,
  doneActions,
  againLabel = "Practice again",
  allowAgain = true,
}: {
  title: string;
  description: string;
  startLabel?: string;
  ready: boolean;
  start: () => Promise<PracticeStart>;
  onFinished?: (summary: FinishResult) => void;
  showMastery?: boolean;
  doneActions?: React.ReactNode;
  againLabel?: string;
  allowAgain?: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "loading" | "question" | "finishing" | "done">("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<PublicExercise[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [summary, setSummary] = useState<FinishResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exercise = exercises[index];

  function resetInput(ex: PublicExercise | undefined) {
    setResult(null);
    setPicked([]);
    setAnswer(ex?.type === "correct_sentence" ? ex.prompt : "");
  }

  async function begin() {
    setPhase("loading");
    setError(null);
    setSummary(null);
    try {
      const data = await start();
      const answered = data.answered ?? {};
      setSessionId(data.sessionId);
      setExercises(data.exercises);
      setResults(data.exercises.map((e) => answered[e.id]).filter((r): r is CheckResult => Boolean(r)));
      if (data.finished) {
        const correct = Object.values(answered).filter((a) => a.correct).length;
        setSummary({ score: data.score ?? null, correct, total: Object.keys(answered).length, mastery: null });
        setPhase("done");
        return;
      }
      const firstOpen = data.exercises.findIndex((e) => !answered[e.id]);
      const at = firstOpen === -1 ? data.exercises.length - 1 : firstOpen;
      setIndex(at);
      resetInput(data.exercises[at]);
      if (firstOpen === -1) setResult(answered[data.exercises[at]!.id] ?? null);
      setPhase("question");
    } catch (err) {
      setError((err as Error).message);
      setPhase("idle");
    }
  }

  const currentAnswer = exercise?.type === "reorder" ? picked.map((i) => exercise.options[i]).join(" ") : answer;

  async function check() {
    if (!exercise || !sessionId || !currentAnswer.trim()) return;
    setChecking(true);
    setError(null);
    try {
      const res = await postJson<CheckResult>(`/api/grammar/practice/${sessionId}/answer`, { exerciseId: exercise.id, answer: currentAnswer });
      setResult(res);
      setResults((r) => [...r, res]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setChecking(false);
    }
  }

  async function next() {
    if (index + 1 < exercises.length) {
      setIndex(index + 1);
      resetInput(exercises[index + 1]);
      return;
    }
    setPhase("finishing");
    try {
      const res = await postJson<FinishResult>(`/api/grammar/practice/${sessionId}/finish`, {});
      setSummary(res);
      onFinished?.(res);
    } catch (err) {
      setError((err as Error).message);
    }
    setPhase("done");
  }

  // Keyboard: Enter checks / continues.
  useEffect(() => {
    if (phase !== "question") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      if (result) void next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (phase === "idle" || phase === "loading") {
    return (
      <Card className="flex flex-col items-start gap-3 border-2 border-primary/30">
        <CardTitle className="text-2xl">{title}</CardTitle>
        <p className="text-muted-foreground">{description}</p>
        {error ? (
          <Alert className="w-full" action={<Button size="sm" variant="secondary" onClick={begin}><RotateCcw className="size-4" /> Retry</Button>}>
            {error}
          </Alert>
        ) : null}
        <Button onClick={begin} loading={phase === "loading"} disabled={!ready}>
          {phase === "loading" ? "Preparing questions…" : startLabel}
        </Button>
      </Card>
    );
  }

  if (phase === "done" || phase === "finishing") {
    const correct = summary?.correct ?? results.filter((r) => r.correct).length;
    const total = summary?.total ?? results.length;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    return (
      <Card className="flex flex-col gap-4 border-2 border-primary/30">
        <div className="flex items-center gap-3">
          <Trophy className={cn("size-8", pct >= 80 ? "text-streak" : "text-muted-foreground")} aria-hidden />
          <div>
            <CardTitle className="text-2xl">{pct >= 80 ? "Great work!" : pct >= 50 ? "Good practice!" : "Keep practising!"}</CardTitle>
            <p className="text-muted-foreground">
              {correct} of {total} correct · {pct}%
            </p>
          </div>
        </div>
        {showMastery && summary?.mastery !== null && summary?.mastery !== undefined ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="shrink-0">Topic mastery</span>
            <ProgressBar value={summary.mastery} color={summary.mastery >= 80 ? "var(--correct)" : "var(--primary)"} label="Mastery" />
            <span className="font-mono">{Math.round(summary.mastery)}%</span>
          </div>
        ) : null}
        {results.some((r) => !r.correct) ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Review</p>
            <ul className="flex flex-col gap-2">
              {results
                .filter((r) => !r.correct)
                .map((r, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded bg-mistake-soft px-1.5 line-through decoration-mistake">{r.given}</span>
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                    <span className="rounded bg-correct-soft px-1.5 font-semibold">{r.correctAnswer}</span>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
        {error ? <Alert>{error}</Alert> : null}
        <div className="flex flex-wrap gap-2">
          {allowAgain ? (
            <Button onClick={begin} loading={phase === "finishing"}>
              <RotateCcw className="size-4" /> {againLabel}
            </Button>
          ) : null}
          {doneActions}
        </div>
      </Card>
    );
  }

  if (!exercise) return null;

  return (
    <Card className="flex flex-col gap-4 border-2 border-primary/30">
      <div className="flex items-center gap-3">
        <ProgressBar value={(index / exercises.length) * 100} label="Practice progress" />
        <span className="font-mono text-sm text-muted-foreground">
          {index + 1}/{exercises.length}
        </span>
      </div>
      <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">{INSTRUCTIONS[exercise.type]}</p>
      <p className="font-display text-2xl font-bold leading-snug">
        {exercise.type === "reorder" || exercise.type === "question"
          ? exercise.prompt
          : exercise.prompt.split("___").map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 ? (
                  <span className="mx-1 inline-block min-w-16 border-b-2 border-dashed border-primary text-center text-primary">
                    {(exercise.type === "multiple_choice" || exercise.type === "fill_blank") && answer ? answer : " "}
                  </span>
                ) : null}
              </span>
            ))}
      </p>

      {exercise.type === "multiple_choice" || exercise.type === "question" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {exercise.options.map((option) => (
            <button
              key={option}
              type="button"
              disabled={!!result}
              onClick={() => setAnswer(option)}
              aria-pressed={answer === option}
              className={cn(
                "min-h-12 rounded-xl border-2 px-4 py-2 text-left text-[16px] font-medium transition-colors",
                answer === option ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary/40",
                result && option === result.correctAnswer && "border-correct bg-correct-soft",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}

      {exercise.type === "fill_blank" ? (
        <input
          autoFocus
          value={answer}
          disabled={!!result}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !result && void check()}
          placeholder="Type your answer"
          aria-label="Your answer"
          className="h-12 rounded-xl border-2 border-border bg-background px-4 text-[17px] outline-none focus:border-primary"
        />
      ) : null}

      {exercise.type === "correct_sentence" ? (
        <textarea
          autoFocus
          value={answer}
          disabled={!!result}
          onChange={(e) => setAnswer(e.target.value)}
          rows={2}
          aria-label="Corrected sentence"
          className="rounded-xl border-2 border-border bg-background px-4 py-3 text-[17px] outline-none focus:border-primary"
        />
      ) : null}

      {exercise.type === "reorder" ? (
        <div className="flex flex-col gap-3">
          <div className="flex min-h-14 flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-border p-2" aria-label="Your sentence">
            {picked.length === 0 ? <span className="px-2 text-muted-foreground">Tap words below</span> : null}
            {picked.map((optIndex, i) => (
              <button
                key={`${optIndex}-${i}`}
                type="button"
                disabled={!!result}
                onClick={() => setPicked(picked.filter((_, j) => j !== i))}
                className="rounded-lg border border-primary bg-primary-soft px-3 py-1.5 text-[16px]"
              >
                {exercise.options[optIndex]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {exercise.options.map((chunk, optIndex) =>
              picked.includes(optIndex) ? (
                <span key={optIndex} className="rounded-lg border border-border bg-muted px-3 py-1.5 text-[16px] text-transparent">
                  {chunk}
                </span>
              ) : (
                <button
                  key={optIndex}
                  type="button"
                  disabled={!!result}
                  onClick={() => setPicked([...picked, optIndex])}
                  className="pressable rounded-lg border border-border bg-card px-3 py-1.5 text-[16px] [--edge:var(--border)]"
                >
                  {chunk}
                </button>
              ),
            )}
          </div>
        </div>
      ) : null}

      {result ? (
        <div className={cn("flex flex-col gap-1 rounded-xl border-l-4 p-4", result.correct ? "border-l-correct bg-correct-soft" : "border-l-mistake bg-mistake-soft")} role="status">
          <p className="flex items-center gap-2 font-semibold">
            {result.correct ? <Check className="size-5 text-correct" /> : <X className="size-5 text-mistake" />}
            {result.correct ? "Correct!" : "Not quite"}
          </p>
          {!result.correct ? (
            <p>
              Answer: <span className="font-semibold">{result.correctAnswer}</span>
            </p>
          ) : null}
          {result.feedback && result.feedback !== "Correct!" && result.feedback !== "Not quite." ? <p className="text-sm">{result.feedback}</p> : null}
          <p className="text-sm text-muted-foreground">{result.explanation}</p>
        </div>
      ) : null}

      {error ? (
        <Alert action={!result ? <Button size="sm" variant="secondary" onClick={check}><RotateCcw className="size-4" /> Retry</Button> : null}>{error}</Alert>
      ) : null}

      <div className="flex justify-between gap-2">
        <Chip tone="neutral">{results.filter((r) => r.correct).length} correct</Chip>
        {result ? (
          <Button onClick={next} loading={phase !== "question"}>
            {index + 1 < exercises.length ? "Continue" : "See results"} <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={check} loading={checking} disabled={!currentAnswer.trim()}>
            Check
          </Button>
        )}
      </div>
    </Card>
  );
}
