"use client";

import { Alert, Button, Card, cn } from "@repo/ui";
import { RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client";

/** Shared "choose a theme (and options) → AI creates content → open it" form for Reading, Listening and Idioms. */
export function ThemePicker({
  themes,
  endpoint,
  hrefFor,
  submitLabel,
  busyLabel,
  options,
  setupMessage,
}: {
  themes: string[];
  endpoint: string;
  hrefFor: (id: string) => string;
  submitLabel: string;
  busyLabel: string;
  options?: { name: string; label: string; choices: { value: string; label: string }[] };
  setupMessage: string | null;
}) {
  const router = useRouter();
  const [theme, setTheme] = useState(themes[0] ?? "");
  const [option, setOption] = useState(options?.choices[0]?.value ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const { id } = await postJson<{ id: string }>(endpoint, { theme, ...(options ? { [options.name]: option } : {}) }, "POST", { retries: 0 });
      router.push(hrefFor(id));
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
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Theme</legend>
        <div className="flex flex-wrap gap-2">
          {themes.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={theme === t}
              onClick={() => setTheme(t)}
              className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold", theme === t ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-muted")}
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>
      {options ? (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{options.label}</legend>
          <div className="flex flex-wrap gap-2">
            {options.choices.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-pressed={option === c.value}
                onClick={() => setOption(c.value)}
                className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold", option === c.value ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-muted")}
              >
                {c.label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      {error ? (
        <Alert action={<Button size="sm" variant="secondary" onClick={create} loading={busy}><RotateCcw className="size-4" /> Retry</Button>}>{error}</Alert>
      ) : null}
      <Button onClick={create} loading={busy} disabled={!theme || setupMessage !== null} className="self-start">
        {busy ? busyLabel : (
          <>
            <Sparkles className="size-4" /> {submitLabel}
          </>
        )}
      </Button>
    </Card>
  );
}
