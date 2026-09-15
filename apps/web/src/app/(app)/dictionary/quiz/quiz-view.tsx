"use client";

import { Button, Card, cn, EmptyState } from "@repo/ui";
import { BookMarked } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PracticeRunner, type PracticeStart } from "@/components/practice-runner";
import { postJson } from "@/lib/client";

const MODES = [
  { id: "due", label: "Due words first" },
  { id: "recent", label: "Recently added" },
  { id: "all", label: "Any words" },
] as const;

export function QuizView({ wordCount, dueCount }: { wordCount: number; dueCount: number }) {
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>(dueCount >= 4 ? "due" : "recent");
  const [round, setRound] = useState(0);

  if (wordCount < 4) {
    return (
      <Card>
        <EmptyState
          icon={<BookMarked className="size-5" />}
          title="Add a few more words first"
          body={`You have ${wordCount} word${wordCount === 1 ? "" : "s"}. Add at least 4 to your dictionary to take a quiz.`}
          action={
            <Link href="/dictionary">
              <Button size="sm">Open dictionary</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Which words">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={mode === m.id}
            onClick={() => {
              setMode(m.id);
              setRound((r) => r + 1);
            }}
            className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold", mode === m.id ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-muted")}
          >
            {m.label}
            {m.id === "due" ? <span className="ml-1 font-mono text-xs opacity-70">{dueCount}</span> : null}
          </button>
        ))}
      </div>
      <PracticeRunner
        key={`${mode}-${round}`}
        title="Ready?"
        description="Free-sentence answers are checked by AI — any correct sentence counts."
        startLabel="Start quiz"
        againLabel="New quiz"
        ready
        // Each start creates a new quiz, so never retry automatically.
        start={() => postJson<PracticeStart>("/api/dictionary/quiz", { mode }, "POST", { retries: 0 })}
        doneActions={
          <Link href="/review">
            <Button variant="secondary">Review flashcards</Button>
          </Link>
        }
      />
    </>
  );
}
