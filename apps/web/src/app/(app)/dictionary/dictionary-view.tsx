"use client";

import type { TranslationLanguage } from "@repo/core";
import { Alert, Button, Card, Chip, cn, EmptyState } from "@repo/ui";
import { BookMarked, ListChecks, LoaderCircle, Plus, RotateCcw, Search, Sparkles, Trash2, Volume2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSpeaker, type VoiceMode } from "@/components/voice";
import { postJson, toError } from "@/lib/client";

export interface DictionaryEntry {
  id: string;
  term: string;
  partOfSpeech: string | null;
  definition: string;
  translation: string | null;
  usageNote: string | null;
  usageNative: string | null;
  example: string | null;
  source: string;
  state: "NEW" | "LEARNING" | "REVIEW" | "RELEARNING";
  due: string;
  createdAt: string;
}

type Filter = "all" | "due" | "new" | "learning" | "known";
type Sort = "recent" | "az";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "due", label: "Due" },
  { id: "new", label: "New" },
  { id: "learning", label: "Learning" },
  { id: "known", label: "Known" },
];

const SOURCE_LABEL: Record<string, string> = {
  "tutor-chat": "From chat",
  selection: "Selected text",
  manual: "Added by you",
  seed: "Starter word",
};

const PAGE = 60;

function matchesFilter(e: DictionaryEntry, filter: Filter, now: number) {
  switch (filter) {
    case "all":
      return true;
    case "due":
      return new Date(e.due).getTime() <= now;
    case "new":
      return e.state === "NEW";
    case "learning":
      return e.state === "LEARNING" || e.state === "RELEARNING";
    case "known":
      return e.state === "REVIEW";
  }
}

export function DictionaryView({
  entries: initialEntries,
  initialQuery,
  nativeLang,
  voiceMode,
}: {
  entries: DictionaryEntry[];
  initialQuery: string;
  nativeLang: TranslationLanguage;
  voiceMode: VoiceMode;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [limit, setLimit] = useState(PAGE);
  const [newWord, setNewWord] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const speaker = useSpeaker(voiceMode);

  const now = Date.now();
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = entries.filter(
      (e) =>
        matchesFilter(e, filter, now) &&
        (!q || e.term.includes(q) || e.definition.toLowerCase().includes(q) || (e.translation ?? "").includes(query.trim())),
    );
    return sort === "az" ? [...list].sort((a, b) => a.term.localeCompare(b.term)) : list;
  }, [entries, filter, now, query, sort]);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, entries.filter((e) => matchesFilter(e, f.id, now)).length])) as Record<Filter, number>,
    [entries, now],
  );

  async function lookup(text: string, replaceId?: string) {
    const entry = await postJson<Omit<DictionaryEntry, "source" | "state" | "due" | "createdAt"> & { alreadyExisted: boolean }>("/api/vocab/smart", {
      text,
    });
    setEntries((list) => {
      const existing = list.find((e) => e.id === entry.id || e.id === replaceId);
      const merged: DictionaryEntry = {
        source: "manual",
        state: "NEW",
        due: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        ...existing,
        ...entry,
      };
      return existing ? list.map((e) => (e.id === existing.id ? merged : e)) : [merged, ...list];
    });
  }

  async function addWord() {
    const text = newWord.trim();
    if (!text) return;
    setAdding(true);
    setError(null);
    try {
      await lookup(text);
      setNewWord("");
      setQuery("");
      setFilter("all");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
            <BookMarked className="size-7 text-primary" /> Dictionary
          </h1>
          <p className="mt-1 text-muted-foreground">
            Your words with {nativeLang.name} meanings and when to use them. They&apos;re also your flashcards.
          </p>
        </div>
        <span className="flex items-center gap-3">
          <span className="font-mono text-sm text-muted-foreground">{entries.length} words</span>
          {entries.length >= 4 ? (
            <Link href="/dictionary/quiz">
              <Button variant="secondary">
                <ListChecks className="size-4" /> Quiz me
              </Button>
            </Link>
          ) : null}
        </span>
      </header>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void addWord();
        }}
      >
        <input
          value={newWord}
          maxLength={60}
          onChange={(e) => setNewWord(e.target.value)}
          placeholder="Add a word or phrase, e.g. look forward to"
          aria-label="New word"
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-card px-3 outline-none focus:border-primary"
        />
        <Button type="submit" loading={adding} disabled={!newWord.trim()}>
          {adding ? null : <Plus className="size-4" />} {adding ? "Looking up…" : "Add"}
        </Button>
      </form>
      {error ? (
        <Alert
          action={
            newWord.trim() ? (
              <Button size="sm" variant="secondary" onClick={() => void addWord()} loading={adding}>
                <RotateCcw className="size-4" /> Retry
              </Button>
            ) : null
          }
        >
          {error}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative flex-1 md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
            placeholder={`Search in English or ${nativeLang.name}`}
            aria-label="Search dictionary"
            className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => {
                setFilter(f.id);
                setLimit(PAGE);
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-semibold",
                filter === f.id ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-muted",
              )}
            >
              {f.label} <span className="font-mono text-xs opacity-70">{counts[f.id]}</span>
            </button>
          ))}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="Sort"
            className="h-9 rounded-xl border border-border bg-card px-2 text-sm outline-none focus:border-primary"
          >
            <option value="recent">Newest</option>
            <option value="az">A–Z</option>
          </select>
        </div>
      </div>

      {entries.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookMarked className="size-5" />}
            title="Your dictionary is empty"
            body="Add a word above, tap “Add to dictionary” under a tutor reply, or select any word and right-click."
          />
        </Card>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">No words match.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {visible.slice(0, limit).map((entry) => (
            <li key={entry.id}>
              <EntryCard
                entry={entry}
                nativeLang={nativeLang}
                playing={speaker.playingId === entry.id}
                onPlay={() => speaker.play(entry.id, entry.example ? `${entry.term}. ${entry.example}` : entry.term)}
                onEnrich={() => lookup(entry.term, entry.id)}
                onDeleted={() => setEntries((list) => list.filter((e) => e.id !== entry.id))}
              />
            </li>
          ))}
        </ul>
      )}

      {visible.length > limit ? (
        <Button variant="secondary" className="self-center" onClick={() => setLimit((l) => l + PAGE)}>
          Show more ({visible.length - limit})
        </Button>
      ) : null}
    </main>
  );
}

function EntryCard({
  entry,
  nativeLang,
  playing,
  onPlay,
  onEnrich,
  onDeleted,
}: {
  entry: DictionaryEntry;
  nativeLang: TranslationLanguage;
  playing: boolean;
  onPlay: () => void;
  onEnrich: () => Promise<void>;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState<"enrich" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(null);
  const native = (extra: string) => cn(nativeLang.code === "ur" ? "font-urdu leading-[2.1]" : "leading-relaxed", extra);
  const isDue = new Date(entry.due).getTime() <= Date.now();
  const status =
    entry.state === "NEW" ? { label: "New", tone: "highlight" as const } : entry.state === "REVIEW" ? { label: "Known", tone: "correct" as const } : { label: "Learning", tone: "primary" as const };

  async function enrich() {
    setBusy("enrich");
    setError(null);
    try {
      await onEnrich();
    } catch (err) {
      setError({ message: (err as Error).message, retry: () => void enrich() });
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/vocab/${entry.id}`, { method: "DELETE" });
      if (!res.ok) throw await toError(res);
      onDeleted();
    } catch (err) {
      setError({ message: (err as Error).message, retry: () => void remove() });
      setBusy(null);
    }
  }

  return (
    <Card className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="highlighter font-display text-2xl font-extrabold leading-tight">{entry.term}</p>
          {entry.partOfSpeech ? <p className="mt-1 font-mono text-xs text-muted-foreground">{entry.partOfSpeech}</p> : null}
        </div>
        <button
          type="button"
          onClick={onPlay}
          className={cn("grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft", playing ? "text-primary" : "text-primary/80")}
          aria-label={`Pronounce ${entry.term}`}
        >
          <Volume2 className="size-4" />
        </button>
      </div>

      {entry.translation ? (
        <p lang={nativeLang.code} dir={nativeLang.rtl ? "rtl" : "ltr"} className={native("text-xl font-semibold")}>
          {entry.translation}
        </p>
      ) : null}

      <p className="text-[15px]">{entry.definition}</p>

      {entry.usageNote || entry.usageNative ? (
        <div className="flex flex-col gap-1 rounded-xl bg-muted px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">When to use it</p>
          {entry.usageNote ? <p className="text-sm">{entry.usageNote}</p> : null}
          {entry.usageNative ? (
            <p lang={nativeLang.code} dir={nativeLang.rtl ? "rtl" : "ltr"} className={native("text-[15px] text-muted-foreground")}>
              {entry.usageNative}
            </p>
          ) : null}
        </div>
      ) : null}

      {entry.example ? <p className="border-l-4 border-l-highlight pl-3 text-sm italic">“{entry.example}”</p> : null}

      {!entry.translation || !entry.usageNote ? (
        <Button size="sm" variant="soft" className="self-start" onClick={enrich} disabled={busy !== null}>
          {busy === "enrich" ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Get {nativeLang.name} & usage
        </Button>
      ) : null}

      {error ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-mistake">
          {error.message}
          <button type="button" onClick={error.retry} disabled={busy !== null} className="inline-flex items-center gap-1 font-semibold text-primary">
            <RotateCcw className="size-3.5" /> Retry
          </button>
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="flex flex-wrap items-center gap-1.5">
          <Chip tone={status.tone}>{status.label}</Chip>
          {isDue ? <Chip tone="mistake">Due</Chip> : null}
          <span>
            {SOURCE_LABEL[entry.source] ?? entry.source} · {new Date(entry.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
          </span>
        </span>
        {confirmDelete ? (
          <span className="flex items-center gap-1">
            <Button size="sm" variant="danger" onClick={remove} loading={busy === "delete"}>
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
              Keep
            </Button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="grid size-8 place-items-center rounded-full hover:bg-mistake-soft hover:text-mistake"
            aria-label={`Delete ${entry.term}`}
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </Card>
  );
}
