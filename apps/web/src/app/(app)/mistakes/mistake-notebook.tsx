"use client";

import { Alert, Button, Card, Chip, cn, EmptyState } from "@repo/ui";
import { ArrowRight, BookOpen, Check, ChevronDown, Dumbbell, NotebookPen, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PracticeRunner, type PracticeStart } from "@/components/practice-runner";
import { postJson } from "@/lib/client";
import { humanizeCategory } from "@/lib/labels";

export interface NotebookMistake {
  id: string;
  type: string;
  category: string;
  original: string;
  corrected: string;
  explanation: string;
  createdAt: string;
  sourceLabel: string;
  sourceHref: string | null;
  topicId: string | null;
}

const TYPES = ["ALL", "GRAMMAR", "VOCAB", "SPELLING", "PRONUNCIATION"] as const;

export function MistakeNotebook({ mistakes: initial, setupMessage }: { mistakes: NotebookMistake[]; setupMessage: string | null }) {
  const [mistakes, setMistakes] = useState(initial);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("ALL");
  const [open, setOpen] = useState<string | null>(null);
  const [practising, setPractising] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = mistakes.filter(
      (m) =>
        (type === "ALL" || m.type === type) &&
        (!q || m.original.toLowerCase().includes(q) || m.corrected.toLowerCase().includes(q) || m.category.includes(q)),
    );
    const map = new Map<string, NotebookMistake[]>();
    for (const m of filtered) map.set(m.category, [...(map.get(m.category) ?? []), m]);
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [mistakes, query, type]);

  async function resolve(target: { id?: string; category?: string }) {
    setError(null);
    try {
      await postJson("/api/mistakes/resolve", target);
      setMistakes((all) => all.filter((m) => (target.id ? m.id !== target.id : m.category !== target.category)));
      if (target.category && practising === target.category) setPractising(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!mistakes.length) {
    return (
      <Card>
        <EmptyState icon={<NotebookPen className="size-5" />} title="No open mistakes" body="Chat with the tutor or use the writing coach — corrections collect here." />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {setupMessage ? <Alert tone="streak">{setupMessage}</Alert> : null}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative flex-1 md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search mistakes"
            aria-label="Search mistakes"
            className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              onClick={() => setType(t)}
              className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold", type === t ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-muted")}
            >
              {t === "ALL" ? "All" : humanizeCategory(t.toLowerCase())}
            </button>
          ))}
        </div>
      </div>
      {error ? <Alert>{error}</Alert> : null}

      <ul className="flex flex-col gap-3">
        {groups.map(([category, items]) => {
          const expanded = open === category;
          const topicId = items[0]?.topicId;
          return (
            <li key={category}>
              <Card className="flex flex-col gap-3">
                <button type="button" onClick={() => setOpen(expanded ? null : category)} className="flex items-center gap-3 text-left" aria-expanded={expanded}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-mistake-soft font-mono text-sm font-semibold">{items.length}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{humanizeCategory(category)}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {items[0]!.original} → {items[0]!.corrected}
                    </span>
                  </span>
                  <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
                </button>

                {expanded ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => setPractising(category)} disabled={setupMessage !== null}>
                        <Dumbbell className="size-4" /> Practice this
                      </Button>
                      {topicId ? (
                        <Link href={`/grammar/${topicId}`}>
                          <Button size="sm" variant="secondary">
                            <BookOpen className="size-4" /> Lesson
                          </Button>
                        </Link>
                      ) : null}
                      <Button size="sm" variant="ghost" onClick={() => resolve({ category })}>
                        <Check className="size-4" /> Mark all learned
                      </Button>
                    </div>

                    {practising === category ? (
                      <PracticeRunner
                        title={`Practice: ${humanizeCategory(category)}`}
                        description="8 questions made from these exact mistakes."
                        startLabel="Start"
                        ready
                        start={() => postJson<PracticeStart>("/api/mistakes/practice", { category }, "POST", { retries: 0 })}
                        doneActions={
                          <Button variant="secondary" onClick={() => resolve({ category })}>
                            <Check className="size-4" /> I&apos;ve got it — mark learned
                          </Button>
                        }
                      />
                    ) : null}

                    <ul className="flex flex-col gap-2">
                      {items.map((m) => (
                        <li key={m.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-[15px]">
                              <span className="rounded bg-mistake-soft px-1.5 line-through decoration-mistake decoration-2">{m.original}</span>
                              <ArrowRight className="size-4 text-muted-foreground" aria-label="corrected to" />
                              <span className="rounded bg-correct-soft px-1.5 font-semibold">{m.corrected}</span>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{m.explanation}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {m.sourceHref ? (
                                <Link href={m.sourceHref} className="font-semibold text-primary">
                                  {m.sourceLabel}
                                </Link>
                              ) : (
                                m.sourceLabel
                              )}{" "}
                              · {new Date(m.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })} ·{" "}
                              <Chip tone="neutral" className="px-1.5 py-0 text-[10px]">
                                {m.type.toLowerCase()}
                              </Chip>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => resolve({ id: m.id })}
                            className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-correct-soft hover:text-correct"
                            aria-label="Mark learned"
                            title="Mark learned"
                          >
                            <Check className="size-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
