"use client";

import { Alert, Button, Card, CardTitle, Chip, cn } from "@repo/ui";
import { CalendarCheck, Check, Layers, MessageCircle, PartyPopper, PenLine } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PracticeRunner, type PracticeStart } from "@/components/practice-runner";
import { postJson } from "@/lib/client";

export function DailyView({
  dateLabel,
  dueCount,
  prepared,
  finished: initiallyFinished,
  score,
  focusTopic,
  setupMessage,
}: {
  dateLabel: string;
  dueCount: number;
  prepared: boolean;
  finished: boolean;
  score: number | null;
  focusTopic: { id: string; title: string } | null;
  setupMessage: string | null;
}) {
  const [finished, setFinished] = useState(initiallyFinished);
  const cardsDone = dueCount === 0;
  const chatHref = `/tutor?topic=free${focusTopic ? `&focus=${encodeURIComponent(focusTopic.title)}` : ""}`;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 lg:py-10">
      <header>
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
        <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
          <CalendarCheck className="size-7 text-primary" /> Daily review
        </h1>
        <p className="mt-1 text-muted-foreground">About 10 minutes: your flashcards, your own mistakes, then a short chat.</p>
      </header>

      {finished && cardsDone ? (
        <Alert tone="correct">
          <span className="flex items-center gap-2 font-semibold">
            <PartyPopper className="size-4" /> Today&apos;s review is complete{score !== null ? ` · ${Math.round(score)}%` : ""}. See you tomorrow!
          </span>
        </Alert>
      ) : null}

      {setupMessage ? (
        <Alert tone="streak" action={<Link href="/settings" className="font-semibold text-primary">Settings →</Link>}>
          {setupMessage}
        </Alert>
      ) : null}

      <Step number={1} title="Flashcards" done={cardsDone} icon={<Layers className="size-5" />}>
        {cardsDone ? (
          <p className="text-muted-foreground">No cards due right now.</p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>
              <span className="font-display text-2xl font-extrabold">{dueCount}</span> card{dueCount === 1 ? "" : "s"} due
            </p>
            <Link href="/review">
              <Button>Review cards</Button>
            </Link>
          </div>
        )}
      </Step>

      <Step number={2} title="Fix your mistakes" done={finished} icon={<PenLine className="size-5" />}>
        <PracticeRunner
          title={finished ? "Today's questions" : "8 questions made for you"}
          description={`Built from mistakes in your recent chats and writing${focusTopic ? `, plus ${focusTopic.title}` : ""}.${prepared ? " Ready." : " They'll be created when you start."}`}
          startLabel={finished ? "See results" : "Start"}
          ready={setupMessage === null}
          allowAgain={false}
          start={() => postJson<PracticeStart>("/api/daily", {})}
          onFinished={() => setFinished(true)}
          doneActions={
            focusTopic ? (
              <Link href={`/grammar/${focusTopic.id}`}>
                <Button variant="secondary">Study {focusTopic.title}</Button>
              </Link>
            ) : null
          }
        />
      </Step>

      <Step number={3} title="Use it in conversation" done={false} icon={<MessageCircle className="size-5" />}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground">
            A 3-minute chat{focusTopic ? ` where you'll naturally need ${focusTopic.title}` : ""}. Try the 📞 voice mode!
          </p>
          <Link href={chatHref}>
            <Button variant="secondary">
              <MessageCircle className="size-4" /> Start chat
            </Button>
          </Link>
        </div>
      </Step>
    </main>
  );
}

function Step({ number, title, done, icon, children }: { number: number; title: string; done: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex gap-3 md:gap-4">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full font-mono text-sm font-semibold",
            done ? "bg-correct text-white" : "bg-primary-soft text-primary",
          )}
          aria-hidden
        >
          {done ? <Check className="size-5" /> : number}
        </span>
        <span className="mt-2 w-0.5 flex-1 bg-border" aria-hidden />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 pb-2">
        <CardTitle className="flex items-center gap-2">
          {icon} {title} {done ? <Chip tone="correct">Done</Chip> : null}
        </CardTitle>
        {number === 2 ? children : <Card>{children}</Card>}
      </div>
    </section>
  );
}
