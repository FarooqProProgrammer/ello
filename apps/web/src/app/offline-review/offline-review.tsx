"use client";

import { Button, Card, Chip, cn, EmptyState } from "@repo/ui";
import { CloudOff, CloudUpload, House, Layers, RefreshCw, Wifi } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface OfflineCard {
  id: string;
  term: string;
  definition: string;
  translation: string | null;
  example: string | null;
}

type Rating = "AGAIN" | "HARD" | "GOOD" | "EASY";
interface QueuedRating {
  id: string;
  rating: Rating;
  at: string;
}

const CARDS_KEY = "ello:offline-cards";
const QUEUE_KEY = "ello:offline-ratings";
const RATINGS: { rating: Rating; label: string; className: string }[] = [
  { rating: "AGAIN", label: "Again", className: "bg-mistake-soft border-mistake/60" },
  { rating: "HARD", label: "Hard", className: "bg-streak-soft border-streak/60" },
  { rating: "GOOD", label: "Good", className: "bg-correct-soft border-correct border-2" },
  { rating: "EASY", label: "Easy", className: "bg-highlight-soft border-highlight" },
];

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/** Flashcards that keep working without a connection; ratings sync when back online. */
export function OfflineReview() {
  const [online, setOnline] = useState(true);
  const [deck, setDeck] = useState<{ cards: OfflineCard[]; savedAt: string | null }>({ cards: [], savedAt: null });
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [queue, setQueue] = useState<QueuedRating[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const sync = useCallback(async () => {
    const pending = read<QueuedRating[]>(QUEUE_KEY, []);
    if (!pending.length || !navigator.onLine) return;
    setSyncing(true);
    const remaining: QueuedRating[] = [];
    for (const item of pending) {
      try {
        const res = await fetch(`/api/review/${item.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: item.rating }),
        });
        // 404 = card deleted meanwhile; drop it. Other failures stay queued.
        if (!res.ok && res.status !== 404) remaining.push(item);
      } catch {
        remaining.push(item);
      }
    }
    write(QUEUE_KEY, remaining);
    setQueue(remaining);
    setSyncing(false);
  }, []);

  const download = useCallback(async () => {
    try {
      const res = await fetch("/api/review/due", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { cards: OfflineCard[]; savedAt: string | null };
      // Skip cards already rated offline but not yet synced.
      const rated = new Set(read<QueuedRating[]>(QUEUE_KEY, []).map((q) => q.id));
      const next = { cards: data.cards.filter((c) => !rated.has(c.id)), savedAt: data.savedAt };
      if (data.savedAt) write(CARDS_KEY, next);
      setDeck(next);
      setIndex(0);
    } catch {
      setDeck(read(CARDS_KEY, { cards: [], savedAt: null }));
    }
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    setQueue(read<QueuedRating[]>(QUEUE_KEY, []));
    setDeck(read(CARDS_KEY, { cards: [], savedAt: null }));
    void sync().then(download).finally(() => setLoaded(true));
    const up = () => {
      setOnline(true);
      void sync();
    };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, [download, sync]);

  const card = deck.cards[index];

  function rate(rating: Rating) {
    if (!card) return;
    const nextQueue = [...read<QueuedRating[]>(QUEUE_KEY, []), { id: card.id, rating, at: new Date().toISOString() }];
    write(QUEUE_KEY, nextQueue);
    setQueue(nextQueue);
    const remainingCards = deck.cards.filter((c) => c.id !== card.id);
    const nextDeck = { ...deck, cards: remainingCards };
    write(CARDS_KEY, nextDeck);
    setDeck(nextDeck);
    setIndex((i) => Math.min(i, Math.max(0, remainingCards.length - 1)));
    setFlipped(false);
    if (navigator.onLine) void sync();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-2">
        <Link href="/" className="grid size-10 place-items-center rounded-full hover:bg-muted" aria-label="Home">
          <House className="size-5" />
        </Link>
        <h1 className="flex items-center gap-2 font-display text-xl font-extrabold">
          <Layers className="size-5 text-primary" /> Offline flashcards
        </h1>
        <Chip tone={online ? "correct" : "streak"}>
          {online ? <Wifi className="size-3" /> : <CloudOff className="size-3" />} {online ? "Online" : "Offline"}
        </Chip>
      </header>

      <p className="text-sm text-muted-foreground">
        {deck.savedAt ? `Cards downloaded ${new Date(deck.savedAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}. ` : ""}
        Open this page once while online so it works without internet.
      </p>

      {queue.length ? (
        <Card className="flex items-center justify-between gap-2 p-3">
          <span className="flex items-center gap-2 text-sm">
            <CloudUpload className="size-4" /> {queue.length} rating{queue.length === 1 ? "" : "s"} waiting to sync
          </span>
          <Button size="sm" variant="secondary" onClick={() => void sync()} loading={syncing} disabled={!online}>
            Sync now
          </Button>
        </Card>
      ) : null}

      {!loaded && !card ? (
        <p className="py-10 text-center text-muted-foreground">Loading cards…</p>
      ) : !card ? (
        <Card>
          <EmptyState
            icon={<Layers className="size-5" />}
            title="No cards to review"
            body={online ? "Nothing is due right now." : "Connect once to download your due cards."}
            action={
              online ? (
                <Button size="sm" variant="secondary" onClick={() => void download()}>
                  <RefreshCw className="size-4" /> Check again
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <>
          <p className="text-center font-mono text-sm text-muted-foreground">{deck.cards.length} left</p>
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card p-6 text-center shadow-sm"
          >
            <span className="font-display text-4xl font-extrabold tracking-tight">{card.term}</span>
            {flipped ? (
              <>
                <span className="text-lg">{card.definition}</span>
                {card.translation ? <span className="font-urdu text-xl leading-[2.1]" dir="rtl">{card.translation}</span> : null}
                {card.example ? <span className="rounded-xl bg-muted px-3 py-2 text-sm italic">“{card.example}”</span> : null}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Tap to show the answer</span>
            )}
          </button>
          {flipped ? (
            <div className="grid grid-cols-4 gap-2">
              {RATINGS.map((r) => (
                <button key={r.rating} type="button" onClick={() => rate(r.rating)} className={cn("h-14 rounded-xl border font-semibold", r.className)}>
                  {r.label}
                </button>
              ))}
            </div>
          ) : (
            <Button size="lg" onClick={() => setFlipped(true)}>
              Show answer
            </Button>
          )}
        </>
      )}
    </main>
  );
}
