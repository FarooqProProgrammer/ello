"use client";

import { Alert, Button, Card, cn } from "@repo/ui";
import { RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client";

export function WritingForm({
  types,
  setupMessage,
  initialType,
  initialTask,
}: {
  types: { id: string; label: string; hint: string }[];
  setupMessage: string | null;
  initialType?: string;
  initialTask?: string;
}) {
  const router = useRouter();
  const [type, setType] = useState(initialType ?? types[0]?.id ?? "message");
  const [text, setText] = useState("");
  const [taskPrompt, setTaskPrompt] = useState(initialTask ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const isIelts = type === "ielts-task2";

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      // Not retried automatically: each submission creates a history entry.
      const { id } = await postJson<{ id: string }>("/api/writing", { type, text, ...(taskPrompt.trim() ? { taskPrompt } : {}) }, "POST", { retries: 0 });
      router.push(`/writing/${id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      {setupMessage ? (
        <Alert tone="streak" action={<Link href="/settings" className="font-semibold text-primary">Settings →</Link>}>
          {setupMessage}
        </Alert>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">What are you writing?</legend>
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={type === t.id}
              onClick={() => setType(t.id)}
              title={t.hint}
              className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold", type === t.id ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-muted")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{types.find((t) => t.id === type)?.hint}</p>
      </fieldset>

      {isIelts || type === "essay" ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Task / question (optional)</span>
          <input
            value={taskPrompt}
            maxLength={1000}
            onChange={(e) => setTaskPrompt(e.target.value)}
            placeholder={isIelts ? "e.g. Some people think university education should be free. Discuss both views." : "What was the essay question?"}
            className="h-11 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary"
          />
        </label>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className="flex items-baseline justify-between text-sm font-semibold">
          Your text
          <span className={cn("font-mono text-xs font-normal", isIelts && words > 0 && words < 250 ? "text-mistake" : "text-muted-foreground")}>
            {words} words{isIelts ? " / 250+" : ""}
          </span>
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          maxLength={6000}
          placeholder="Paste or write here…"
          className="resize-y rounded-xl border border-border bg-background px-3 py-2 text-[16px] leading-relaxed outline-none focus:border-primary"
        />
      </label>

      {error ? (
        <Alert action={<Button size="sm" variant="secondary" onClick={submit} loading={busy}><RotateCcw className="size-4" /> Retry</Button>}>{error}</Alert>
      ) : null}

      <Button onClick={submit} loading={busy} disabled={text.trim().length < 20 || setupMessage !== null} className="self-start">
        {busy ? "Reading your text…" : (
          <>
            <Sparkles className="size-4" /> Get feedback
          </>
        )}
      </Button>
    </Card>
  );
}
