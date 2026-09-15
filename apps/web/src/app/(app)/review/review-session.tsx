"use client";

import type { ReviewRating } from "@repo/core";
import { Button, Card, cn, EmptyState, ProgressBar } from "@repo/ui";
import { Layers, MessageCircle, Undo2, Volume2, WifiOff, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSpeaker, type VoiceMode } from "@/components/voice";
import { postJson } from "@/lib/client";
import type { TranslationLanguage } from "@/lib/labels";

export interface ReviewCard {
  id: string;
  term: string;
  definition: string;
  example: string | null;
  partOfSpeech: string | null;
  translation: string | null;
  usageNote: string | null;
  usageNative: string | null;
  source: string;
  isNew: boolean;
  intervals: Record<ReviewRating, string>;
}

const RATING_STYLE: Record<ReviewRating, { label: string; className: string; key: string }> = {
  AGAIN: { label: "Again", key: "1", className: "bg-mistake-soft border-mistake/60" },
  HARD: { label: "Hard", key: "2", className: "bg-streak-soft border-streak/60" },
  GOOD: { label: "Good", key: "3", className: "bg-correct-soft border-correct border-2" },
  EASY: { label: "Easy", key: "4", className: "bg-highlight-soft border-highlight" },
};
const RATINGS = Object.keys(RATING_STYLE) as ReviewRating[];

function Highlighted({ text, term }: { text: string; term: string }) {
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="highlighter bg-transparent font-semibold text-foreground">{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  );
}

export function ReviewSession({ cards, voiceMode, nativeLang }: { cards: ReviewCard[]; voiceMode: VoiceMode; nativeLang: TranslationLanguage }) {
  const nativeClass = (extra: string) => cn(nativeLang.code === "ur" ? "font-urdu leading-[2.1]" : "leading-relaxed", extra);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ratings, setRatings] = useState<{ id: string; rating: ReviewRating }[]>([]);
  const [offline, setOffline] = useState(false);
  const [done, setDone] = useState(false);
  const [lastUndoable, setLastUndoable] = useState<number | null>(null);
  const startedAt = useRef(Date.now());
  const pending = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const speaker = useSpeaker(voiceMode);

  const card = cards[index];

  const commit = useCallback(async (id: string, rating: ReviewRating) => {
    try {
      // Not retried automatically: applying the same rating twice would skew the schedule.
      await postJson(`/api/review/${id}`, { rating }, "POST", { retries: 0 });
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);

  const finish = useCallback(async (all: { id: string; rating: ReviewRating }[]) => {
    // Flush any delayed commits before finishing.
    for (const [id, timer] of pending.current) {
      clearTimeout(timer);
      const r = all.find((x) => x.id === id);
      if (r) await commit(r.id, r.rating);
    }
    pending.current.clear();
    setDone(true);
    if (all.length) {
      try {
        await postJson("/api/review/finish", { ratings: all.map((r) => r.rating) }, "POST", { retries: 0 });
      } catch {
        setOffline(true);
      }
    }
  }, [commit]);

  const rate = useCallback(
    (rating: ReviewRating) => {
      if (!card || !flipped) return;
      const next = [...ratings, { id: card.id, rating }];
      setRatings(next);
      // Delay the write briefly so "Undo" can cancel it.
      pending.current.set(
        card.id,
        setTimeout(() => {
          pending.current.delete(card.id);
          void commit(card.id, rating);
        }, 4000),
      );
      setLastUndoable(index);
      setFlipped(false);
      if (index + 1 >= cards.length) void finish(next);
      else setIndex(index + 1);
    },
    [card, cards.length, commit, finish, flipped, index, ratings],
  );

  const undo = useCallback(() => {
    if (lastUndoable === null || done) return;
    const target = cards[lastUndoable];
    if (!target) return;
    const timer = pending.current.get(target.id);
    if (!timer) return;
    clearTimeout(timer);
    pending.current.delete(target.id);
    setRatings((r) => r.slice(0, -1));
    setIndex(lastUndoable);
    setFlipped(true);
    setLastUndoable(null);
  }, [cards, done, lastUndoable]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && ["1", "2", "3", "4"].includes(e.key)) {
        rate(RATINGS[Number(e.key) - 1]!);
      } else if (e.key.toLowerCase() === "u") {
        undo();
      } else if (e.key.toLowerCase() === "r" && card) {
        void speaker.play(card.id, card.term);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, done, flipped, rate, speaker, undo]);

  if (cards.length === 0) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4">
        <Card>
          <EmptyState
            icon={<Layers className="size-5" />}
            title="All caught up!"
            body="No cards are due. New words from your tutor chats will show up here."
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link href="/tutor">
                  <Button>
                    <MessageCircle className="size-4" /> Learn new words in chat
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="ghost">Back home</Button>
                </Link>
              </div>
            }
          />
        </Card>
      </main>
    );
  }

  if (done) {
    const counts = Object.fromEntries(RATINGS.map((r) => [r, ratings.filter((x) => x.rating === r).length])) as Record<ReviewRating, number>;
    const accuracy = ratings.length ? Math.round(((counts.GOOD + counts.EASY) / ratings.length) * 100) : 0;
    const secs = Math.round((Date.now() - startedAt.current) / 1000);
    const tough = ratings.filter((r) => r.rating === "AGAIN").map((r) => cards.find((c) => c.id === r.id)!).filter(Boolean);
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 px-4 py-10">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Session complete</h1>
        <p className="-mt-3 text-muted-foreground">
          {ratings.length} cards · {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Accuracy", value: `${accuracy}%`, band: "bg-correct" },
            { label: "Cards", value: String(ratings.length), band: "bg-primary" },
            { label: "Again", value: String(counts.AGAIN), band: "bg-mistake" },
          ].map((t) => (
            <div key={t.label} className="overflow-hidden rounded-[var(--radius)] border border-border bg-card text-center">
              <div className={`${t.band} py-1 text-xs font-semibold text-white`}>{t.label}</div>
              <div className="py-3 font-display text-2xl font-extrabold">{t.value}</div>
            </div>
          ))}
        </div>
        <Card>
          <p className="mb-2 text-sm font-semibold">How it went</p>
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {RATINGS.map((r) =>
              counts[r] ? <div key={r} className={cn("h-full", RATING_STYLE[r].className)} style={{ flex: counts[r] }} /> : null,
            )}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {RATINGS.map((r) => (
              <li key={r} className="flex items-center gap-1.5">
                <span className={cn("size-3 rounded-full border", RATING_STYLE[r].className)} aria-hidden />
                {RATING_STYLE[r].label} <span className="font-mono text-muted-foreground">{counts[r]}</span>
              </li>
            ))}
          </ul>
        </Card>
        {tough.length ? (
          <Card>
            <p className="mb-2 text-sm font-semibold">Tough ones</p>
            <ul className="flex flex-wrap gap-2">
              {tough.map((c) => (
                <li key={c.id} className="rounded-full bg-mistake-soft px-3 py-1 text-sm">
                  {c.term}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        {offline ? <p className="flex items-center gap-2 text-sm text-mistake"><WifiOff className="size-4" /> Some ratings couldn&apos;t be saved.</p> : null}
        <div className="flex flex-col gap-2">
          <Link href="/">
            <Button size="lg">Back to Home</Button>
          </Link>
          {tough.length ? (
            <Link href={`/tutor?topic=free&focus=${encodeURIComponent(tough.map((t) => t.term).slice(0, 3).join(", "))}`}>
              <Button size="lg" variant="secondary">
                Practice tough ones in chat
              </Button>
            </Link>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-[max(env(safe-area-inset-bottom),16px)]">
      <header className="flex items-center gap-3 py-4">
        <Link href="/" className="grid size-10 place-items-center rounded-full hover:bg-muted" aria-label="Leave review">
          <X className="size-5" />
        </Link>
        <ProgressBar value={(index / cards.length) * 100} className="flex-1" label="Session progress" />
        <span className="font-mono text-sm text-muted-foreground">
          {index + 1} / {cards.length}
        </span>
        {offline ? <WifiOff className="size-4 text-mistake" aria-label="Saving when back online" /> : null}
      </header>

      <div className="flip-scene flex flex-1 items-center py-4">
        <div className="flip-card relative h-[min(60dvh,420px)] w-full" data-flipped={flipped}>
          <button
            type="button"
            onClick={() => setFlipped(true)}
            className="flip-face absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card p-6 text-center shadow-sm"
            aria-label="Show answer"
            tabIndex={flipped ? -1 : 0}
          >
            <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">{card!.isNew ? "New word" : "Word"}</span>
            <span className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">{card!.term}</span>
            <span className="text-sm text-muted-foreground">Do you remember what it means?</span>
          </button>
          <div className="flip-face flip-back absolute inset-0 flex flex-col gap-3 overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <span className="font-display text-3xl font-extrabold tracking-tight">{card!.term}</span>
              <button
                type="button"
                onClick={() => speaker.play(card!.id, card!.example ? `${card!.term}. ${card!.example}` : card!.term)}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"
                aria-label="Play pronunciation"
              >
                <Volume2 className="size-5" />
              </button>
            </div>
            {card!.partOfSpeech ? <p className="-mt-2 font-mono text-xs text-muted-foreground">{card!.partOfSpeech}</p> : null}
            <p className="text-lg">{card!.definition}</p>
            {card!.translation ? (
              <p lang={nativeLang.code} dir={nativeLang.rtl ? "rtl" : "ltr"} className={nativeClass("text-xl font-semibold")}>
                {card!.translation}
              </p>
            ) : null}
            {card!.usageNote || card!.usageNative ? (
              <div className="flex flex-col gap-1 rounded-xl border border-border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">When to use it</p>
                {card!.usageNote ? <p className="text-sm">{card!.usageNote}</p> : null}
                {card!.usageNative ? (
                  <p lang={nativeLang.code} dir={nativeLang.rtl ? "rtl" : "ltr"} className={nativeClass("text-[15px] text-muted-foreground")}>
                    {card!.usageNative}
                  </p>
                ) : null}
              </div>
            ) : null}
            {card!.example ? (
              <p className="rounded-xl bg-muted p-3 italic">
                “<Highlighted text={card!.example} term={card!.term} />”
              </p>
            ) : null}
            <p className="mt-auto text-xs text-muted-foreground">From: {card!.source === "tutor-chat" ? "your chat" : card!.source}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-muted p-3">
        {!flipped ? (
          <Button size="lg" onClick={() => setFlipped(true)}>
            Show answer
          </Button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => rate(r)}
                className={cn("flex h-16 flex-col items-center justify-center rounded-xl border text-foreground transition-transform active:scale-95", RATING_STYLE[r].className)}
              >
                <span className="text-[15px] font-semibold">{RATING_STYLE[r].label}</span>
                <span className="font-mono text-xs text-muted-foreground">{card!.intervals[r]}</span>
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 hidden items-center justify-between px-1 text-xs text-muted-foreground md:flex">
          <span>
            <kbd className="font-mono">Space</kbd> flip · <kbd className="font-mono">1–4</kbd> rate · <kbd className="font-mono">R</kbd> audio
          </span>
          {lastUndoable !== null ? (
            <button type="button" onClick={undo} className="inline-flex items-center gap-1 font-semibold text-primary">
              <Undo2 className="size-3.5" /> Undo (U)
            </button>
          ) : null}
        </div>
        {lastUndoable !== null ? (
          <button type="button" onClick={undo} className="mt-2 inline-flex items-center gap-1 px-1 text-xs font-semibold text-primary md:hidden">
            <Undo2 className="size-3.5" /> Undo last rating
          </button>
        ) : null}
      </div>
    </main>
  );
}
