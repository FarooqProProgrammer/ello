"use client";

import type { WritingFeedback } from "@repo/activities";
import { findGrammarTopic } from "@repo/core";
import { Button, Card, CardTitle, Chip, cn, ProgressBar } from "@repo/ui";
import { ArrowRight, BookOpen, Check, Copy, PenLine, ThumbsUp, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Correction = WritingFeedback["corrections"][number];

function highlight(text: string, corrections: Correction[], active: number | null, onPick: (i: number) => void) {
  const marks: { start: number; end: number; index: number }[] = [];
  corrections.forEach((c, index) => {
    let from = 0;
    for (;;) {
      const start = text.indexOf(c.original, from);
      if (start === -1) return;
      const end = start + c.original.length;
      if (!marks.some((m) => start < m.end && end > m.start)) {
        marks.push({ start, end, index });
        return;
      }
      from = start + 1;
    }
  });
  marks.sort((a, b) => a.start - b.start);
  const out: React.ReactNode[] = [];
  let cursor = 0;
  for (const m of marks) {
    if (m.start > cursor) out.push(text.slice(cursor, m.start));
    out.push(
      <button
        key={m.index}
        type="button"
        onClick={() => onPick(m.index)}
        className={cn("mistake-mark", active === m.index && "ring-2 ring-highlight")}
        title={`${corrections[m.index]!.corrected} — ${corrections[m.index]!.explanation}`}
      >
        {text.slice(m.start, m.end)}
        <sup className="ml-0.5 font-mono text-[10px] text-mistake">{m.index + 1}</sup>
      </button>,
    );
    cursor = m.end;
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

export function FeedbackView({
  typeLabel,
  isIelts,
  text,
  taskPrompt,
  feedback,
  dateLabel,
}: {
  typeLabel: string;
  isIelts: boolean;
  text: string;
  taskPrompt: string | null;
  feedback: WritingFeedback;
  dateLabel: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const topics = feedback.grammarTopicIds.map((id) => findGrammarTopic(id)).filter((t) => t !== undefined);

  function pick(i: number) {
    setActive(i);
    document.getElementById(`fix-${i}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function copyImproved() {
    try {
      await navigator.clipboard.writeText(feedback.improvedVersion);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center gap-5">
        <div className="grid size-24 shrink-0 place-items-center rounded-full border-4 border-primary bg-primary-soft">
          <span className="text-center">
            <span className="block font-display text-3xl font-extrabold leading-none">{isIelts && feedback.ieltsBand ? feedback.ieltsBand : feedback.score}</span>
            <span className="text-[11px] font-semibold text-muted-foreground">{isIelts && feedback.ieltsBand ? "band" : "/ 100"}</span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            {typeLabel} · {dateLabel}
          </p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Your feedback</h1>
          <p className="mt-1 leading-relaxed">{feedback.summary}</p>
        </div>
      </header>

      {feedback.criteria.length ? (
        <Card className="grid gap-3 sm:grid-cols-2">
          {feedback.criteria.map((c) => {
            const pct = isIelts ? (c.score / 9) * 100 : c.score;
            return (
              <div key={c.name} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold">{c.name}</span>
                  <span className="font-mono">{isIelts ? c.score : Math.round(c.score)}</span>
                </div>
                <ProgressBar value={pct} color={pct >= 70 ? "var(--correct)" : pct >= 45 ? "var(--primary)" : "var(--mistake)"} label={c.name} />
                <p className="text-xs text-muted-foreground">{c.comment}</p>
              </div>
            );
          })}
        </Card>
      ) : null}

      <Card className="flex flex-col gap-3">
        <CardTitle className="flex items-center gap-2">
          <PenLine className="size-5" /> Your text
          <Chip tone={feedback.corrections.length ? "mistake" : "correct"}>
            {feedback.corrections.length ? `${feedback.corrections.length} fixes` : "No mistakes"}
          </Chip>
        </CardTitle>
        {taskPrompt ? <p className="text-sm italic text-muted-foreground">Task: {taskPrompt}</p> : null}
        <p className="whitespace-pre-wrap text-[16px] leading-[1.9]">{highlight(text, feedback.corrections, active, pick)}</p>
      </Card>

      {feedback.corrections.length ? (
        <Card className="flex flex-col gap-3">
          <CardTitle>Corrections</CardTitle>
          <ol className="flex flex-col gap-3">
            {feedback.corrections.map((c, i) => (
              <li
                key={i}
                id={`fix-${i}`}
                className={cn("flex gap-3 rounded-xl border border-border p-3 transition-shadow", active === i && "ring-2 ring-highlight")}
              >
                <span className="font-mono text-xs text-mistake">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[15px]">
                    <span className="rounded bg-mistake-soft px-1.5 line-through decoration-mistake decoration-2">{c.original}</span>
                    <ArrowRight className="size-4 text-muted-foreground" aria-label="corrected to" />
                    <span className="rounded bg-correct-soft px-1.5 font-semibold">{c.corrected}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{c.explanation}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-3 border-correct/40">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Check className="size-5 text-correct" /> Improved version
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={copyImproved}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="whitespace-pre-wrap text-[16px] leading-[1.9]">{feedback.improvedVersion}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-2">
          <CardTitle className="flex items-center gap-2">
            <ThumbsUp className="size-5 text-correct" /> What you did well
          </CardTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {feedback.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Card>
        <Card className="flex flex-col gap-2">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" /> To improve
          </CardTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {feedback.improvements.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Card>
      </div>

      {feedback.vocabularyUpgrades.length ? (
        <Card className="flex flex-col gap-3">
          <CardTitle>Vocabulary upgrades</CardTitle>
          <ul className="flex flex-col gap-2">
            {feedback.vocabularyUpgrades.map((v, i) => (
              <li key={i} className="text-sm">
                <span className="rounded bg-muted px-1.5">{v.original}</span> <ArrowRight className="inline size-3.5 text-muted-foreground" />{" "}
                <span className="highlighter font-semibold">{v.better}</span>
                <span className="text-muted-foreground"> — {v.why}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {topics.length ? (
        <Card className="flex flex-col gap-3">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="size-5" /> Study next
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <Link key={t.id} href={`/grammar/${t.id}`}>
                <Chip tone="primary" className="px-3 py-1.5 text-sm">
                  {t.title} <ArrowRight className="size-3.5" />
                </Chip>
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link href="/writing">
          <Button>
            <PenLine className="size-4" /> Write another
          </Button>
        </Link>
        <Link href="/daily">
          <Button variant="secondary">Practise these mistakes in Daily review</Button>
        </Link>
      </div>
    </div>
  );
}
