"use client";

import { Alert, Button, cn } from "@repo/ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { LoaderCircle, Pencil, Plus, Sparkles, Trash2, Undo2 } from "lucide-react";
import { useId, useState } from "react";
import { ClientApiError, postJson, toError } from "@/lib/client";
import type { ScenarioOption } from "./data";

interface Topic {
  id: string;
  label: string;
  prompt: string;
}

const EXAMPLES = [
  {
    title: "Airport customs",
    description:
      "You are a strict customs officer at Lahore airport. Ask me where I travelled from, what is in my bag and why I have so many gifts. Be polite but serious.",
  },
  {
    title: "Salary negotiation",
    description:
      "You are my manager. I want to ask for a 20% raise. Push back with reasons, and help me practise polite, confident business English.",
  },
];

/** Built-in scenarios plus the learner's own, with create / edit / delete. */
export function ScenarioPicker({
  topics,
  scenarios,
  onScenariosChange,
  onPick,
  disabled,
}: {
  topics: Topic[];
  scenarios: ScenarioOption[];
  onScenariosChange: (next: ScenarioOption[]) => void;
  onPick: (topicId: string) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState<ScenarioOption | "new" | null>(null);

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">What shall we talk about?</h1>
        <p className="mt-1 text-muted-foreground">Pick a scenario — or write your own. I&apos;ll correct your mistakes as we go.</p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your scenarios</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex min-h-24 items-center gap-3 rounded-[var(--radius)] border-2 border-dashed border-primary/40 bg-primary-soft/40 p-4 text-left transition-colors hover:border-primary"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <Plus className="size-5" />
            </span>
            <span>
              <span className="block font-semibold">Create your own</span>
              <span className="text-sm text-muted-foreground">Give it a title and describe the role-play</span>
            </span>
          </button>
          {scenarios.map((s) => (
            <div key={s.id} className="group relative rounded-[var(--radius)] border border-primary/30 bg-card transition-colors hover:border-primary/60">
              <button type="button" disabled={disabled} onClick={() => onPick(`custom:${s.id}`)} className="block w-full p-4 pr-20 text-left disabled:opacity-50">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Sparkles className="size-4 text-primary" aria-hidden /> {s.title}
                </span>
                <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{s.description}</span>
              </button>
              <button
                type="button"
                onClick={() => setEditing(s)}
                className="absolute right-2 top-2 grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Edit ${s.title}`}
              >
                <Pencil className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ready-made</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {topics.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={disabled}
              onClick={() => onPick(t.id)}
              className="rounded-[var(--radius)] border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 disabled:opacity-50"
            >
              <span className="block font-semibold">{t.label}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{t.prompt}</span>
            </button>
          ))}
        </div>
      </div>

      <ScenarioDialog
        scenario={editing}
        canStart={!disabled}
        onClose={() => setEditing(null)}
        onSaved={(saved, start) => {
          const exists = scenarios.some((s) => s.id === saved.id);
          onScenariosChange(exists ? scenarios.map((s) => (s.id === saved.id ? saved : s)) : [saved, ...scenarios]);
          setEditing(null);
          if (start) onPick(`custom:${saved.id}`);
        }}
        onDeleted={(id) => {
          onScenariosChange(scenarios.filter((s) => s.id !== id));
          setEditing(null);
        }}
      />
    </section>
  );
}

function RefineButton({
  label,
  loading,
  disabled,
  onClick,
  undo,
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  undo?: () => void;
}) {
  return (
    <span className="flex items-center gap-1">
      {undo ? (
        <button type="button" onClick={undo} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
          <Undo2 className="size-3.5" /> Undo
        </button>
      ) : null}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary transition-opacity hover:brightness-95 disabled:opacity-50"
      >
        {loading ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
        {loading ? "Refining…" : label}
      </button>
    </span>
  );
}

function ScenarioDialog({
  scenario,
  canStart,
  onClose,
  onSaved,
  onDeleted,
}: {
  scenario: ScenarioOption | "new" | null;
  canStart: boolean;
  onClose: () => void;
  onSaved: (saved: ScenarioOption, start: boolean) => void;
  onDeleted: (id: string) => void;
}) {
  const open = scenario !== null;
  const existing = scenario && scenario !== "new" ? scenario : null;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState<"save" | "start" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOpened, setLastOpened] = useState<ScenarioOption | "new" | null>(null);
  const [refining, setRefining] = useState<"title" | "description" | null>(null);
  const [undo, setUndo] = useState<{ field: "title" | "description"; value: string } | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Reset the form whenever a different scenario is opened.
  if (scenario !== lastOpened) {
    setLastOpened(scenario);
    setTitle(existing?.title ?? "");
    setDescription(existing?.description ?? "");
    setError(null);
    setConfirmDelete(false);
    setUndo(null);
  }

  async function refine(field: "title" | "description") {
    setRefining(field);
    setError(null);
    try {
      const refined = await postJson<{ title: string; description: string }>("/api/scenarios/refine", { title, description, field });
      const next = refined[field].trim();
      if (!next) throw new Error("The AI returned an empty result. Try again.");
      setUndo({ field, value: field === "title" ? title : description });
      if (field === "title") setTitle(next);
      else setDescription(next);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : (err as Error).message);
    } finally {
      setRefining(null);
    }
  }

  function restore() {
    if (!undo) return;
    if (undo.field === "title") setTitle(undo.value);
    else setDescription(undo.value);
    setUndo(null);
  }

  async function save(start: boolean) {
    setBusy(start ? "start" : "save");
    setError(null);
    try {
      const body = { title, description };
      const saved = existing
        ? await postJson<ScenarioOption>(`/api/scenarios/${existing.id}`, body, "PATCH")
        : await postJson<ScenarioOption>("/api/scenarios", body, "POST", { retries: 0 });
      onSaved({ id: saved.id, title: saved.title, description: saved.description }, start);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Couldn't save the scenario.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!existing) return;
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/scenarios/${existing.id}`, { method: "DELETE" });
      if (!res.ok) throw await toError(res);
      onDeleted(existing.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const valid = title.trim().length >= 3 && description.trim().length >= 15;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="gap-5 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold">{existing ? "Edit scenario" : "Create a scenario"}</DialogTitle>
          <DialogDescription>
            Describe the situation, who the tutor should be, and what you want to practise. The AI will follow it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={titleId} className="text-sm font-semibold">
              Title
            </label>
            <RefineButton
              label={title.trim() ? "Refine" : "Suggest"}
              loading={refining === "title"}
              disabled={refining !== null || (title.trim().length < 3 && description.trim().length < 3)}
              onClick={() => refine("title")}
              undo={undo?.field === "title" ? () => restore() : undefined}
            />
          </div>
          <input
            id={titleId}
            value={title}
            maxLength={60}
            disabled={refining === "title"}
            onChange={(e) => {
              setTitle(e.target.value);
              if (undo?.field === "title") setUndo(null);
            }}
            placeholder="e.g. Airport customs"
            className="h-11 rounded-xl border border-border bg-background px-3 text-[15px] outline-none focus:border-primary disabled:opacity-60"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={descriptionId} className="text-sm font-semibold">
              Description
            </label>
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{description.length}/1500</span>
              <RefineButton
                label={description.trim() ? "Refine" : "Write with AI"}
                loading={refining === "description"}
                disabled={refining !== null || (title.trim().length < 3 && description.trim().length < 3)}
                onClick={() => refine("description")}
                undo={undo?.field === "description" ? () => restore() : undefined}
              />
            </span>
          </div>
          <textarea
            id={descriptionId}
            value={description}
            maxLength={1500}
            rows={6}
            disabled={refining === "description"}
            onChange={(e) => {
              setDescription(e.target.value);
              if (undo?.field === "description") setUndo(null);
            }}
            placeholder="You are … Ask me … I want to practise … (English, Urdu or Roman Urdu — AI can refine it)"
            className="resize-y rounded-xl border border-border bg-background px-3 py-2 text-[15px] leading-relaxed outline-none focus:border-primary disabled:opacity-60"
          />
        </div>

        {!existing ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Try an example:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.title}
                type="button"
                onClick={() => {
                  setTitle(ex.title);
                  setDescription(ex.description);
                }}
                className="rounded-full border border-border px-3 py-1 font-semibold hover:bg-muted"
              >
                {ex.title}
              </button>
            ))}
          </div>
        ) : null}

        {error ? <Alert>{error}</Alert> : null}

        <DialogFooter className="items-center sm:justify-between">
          {existing ? (
            confirmDelete ? (
              <span className="flex items-center gap-2 text-sm">
                Delete it?
                <Button size="sm" variant="danger" onClick={remove} loading={busy === "delete"}>
                  Delete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Keep
                </Button>
              </span>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} className="text-mistake">
                <Trash2 className="size-4" /> Delete
              </Button>
            )
          ) : (
            <span />
          )}
          <span className={cn("flex gap-2", confirmDelete && "hidden sm:flex")}>
            <Button variant="secondary" onClick={() => save(false)} loading={busy === "save"} disabled={!valid || busy !== null}>
              Save
            </Button>
            <Button onClick={() => save(true)} loading={busy === "start"} disabled={!valid || busy !== null || !canStart}>
              Save & start chat
            </Button>
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
