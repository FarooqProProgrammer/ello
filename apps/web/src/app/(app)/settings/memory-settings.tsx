"use client";

import { Alert, Button, Card, CardTitle, cn, EmptyState } from "@repo/ui";
import { Brain, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { postJson, toError } from "@/lib/client";

interface Memory {
  id: string;
  fact: string;
  source: string;
  updatedAt: string;
}

export function MemorySettings({ enabled: initialEnabled, memories: initialMemories }: { enabled: boolean; memories: Memory[] }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [memories, setMemories] = useState(initialMemories);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: string; fact: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const toggle = () =>
    run(async () => {
      const next = !enabled;
      await postJson("/api/profile", { memoryEnabled: next }, "PATCH");
      setEnabled(next);
    });

  const add = () =>
    run(async () => {
      const saved = await postJson<{ id: string; fact: string }>("/api/memory", { fact: draft });
      setMemories((m) => [{ ...saved, source: "manual", updatedAt: new Date().toISOString() }, ...m]);
      setDraft("");
    });

  const saveEdit = () =>
    run(async () => {
      if (!editing) return;
      await postJson(`/api/memory/${editing.id}`, { fact: editing.fact }, "PATCH");
      setMemories((m) => m.map((x) => (x.id === editing.id ? { ...x, fact: editing.fact.trim() } : x)));
      setEditing(null);
    });

  const remove = (id: string) =>
    run(async () => {
      const res = await fetch(`/api/memory/${id}`, { method: "DELETE" });
      if (!res.ok) throw await toError(res);
      setMemories((m) => m.filter((x) => x.id !== id));
    });

  const clearAll = () =>
    run(async () => {
      const res = await fetch("/api/memory", { method: "DELETE" });
      if (!res.ok) throw await toError(res);
      setMemories([]);
      setConfirmClear(false);
    });

  return (
    <Card className="flex flex-col gap-5">
      <CardTitle className="flex items-center gap-2">
        <Brain className="size-5" /> Memory
      </CardTitle>

      <div className="flex items-center justify-between gap-4">
        <span>
          <span className="block font-semibold">Let the tutor remember things about me</span>
          <span className="text-sm text-muted-foreground">
            Facts like your job, interests and plans are picked up from chats and used to personalise conversations and lessons.
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Memory"
          disabled={busy}
          onClick={toggle}
          className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", enabled ? "bg-primary" : "bg-muted")}
        >
          <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-transform", enabled ? "translate-x-6" : "translate-x-1")} />
        </button>
      </div>

      {!enabled ? (
        <Alert tone="streak">Memory is off: nothing new is saved and saved facts aren&apos;t used. They stay here until you delete them.</Alert>
      ) : null}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim().length >= 3) void add();
        }}
      >
        <input
          value={draft}
          maxLength={160}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a fact, e.g. Preparing for IELTS in December"
          aria-label="New memory"
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary"
        />
        <Button type="submit" variant="secondary" disabled={busy || draft.trim().length < 3}>
          <Plus className="size-4" /> Add
        </Button>
      </form>

      {error ? <Alert>{error}</Alert> : null}

      {memories.length === 0 ? (
        <EmptyState icon={<Brain className="size-5" />} title="Nothing remembered yet" body="Chat with the tutor and it will note useful facts about you here." />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {memories.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
              {editing?.id === m.id ? (
                <form
                  className="flex min-w-0 flex-1 items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void saveEdit();
                  }}
                >
                  <input
                    autoFocus
                    value={editing.fact}
                    maxLength={160}
                    onChange={(e) => setEditing({ id: m.id, fact: e.target.value })}
                    onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
                    aria-label="Edit memory"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-primary"
                  />
                  <button type="submit" className="grid size-8 place-items-center rounded-full hover:bg-muted" aria-label="Save">
                    <Check className="size-4" />
                  </button>
                  <button type="button" onClick={() => setEditing(null)} className="grid size-8 place-items-center rounded-full hover:bg-muted" aria-label="Cancel">
                    <X className="size-4" />
                  </button>
                </form>
              ) : (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px]">{m.fact}</span>
                    <span className="text-xs text-muted-foreground">
                      {m.source === "manual" ? "Added by you" : "From a chat"} ·{" "}
                      {new Date(m.updatedAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditing({ id: m.id, fact: m.fact })}
                    className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Edit: ${m.fact}`}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(m.id)}
                    disabled={busy}
                    className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-mistake-soft hover:text-mistake"
                    aria-label={`Forget: ${m.fact}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {memories.length ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            {memories.length} fact{memories.length === 1 ? "" : "s"} · the 25 most recent are used in prompts
          </span>
          {confirmClear ? (
            <span className="flex items-center gap-2">
              Forget everything?
              <Button size="sm" variant="danger" onClick={clearAll} loading={busy}>
                Clear all
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
            </span>
          ) : (
            <Button size="sm" variant="ghost" className="text-mistake" onClick={() => setConfirmClear(true)}>
              <Trash2 className="size-4" /> Clear all
            </Button>
          )}
        </div>
      ) : null}
    </Card>
  );
}
