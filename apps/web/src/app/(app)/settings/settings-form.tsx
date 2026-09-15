"use client";

import { CEFR_DESCRIPTIONS, CEFR_LEVELS, GOALS, type CefrLevel, type Goal } from "@repo/core";
import { Button, Card, CardTitle, cn } from "@repo/ui";
import { Check, GraduationCap, Languages, Volume2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client";
import { GOAL_LABELS, LANGUAGES } from "@/lib/labels";

interface Profile {
  name: string | null;
  nativeLanguage: string | null;
  explainInNative: boolean;
  cefrLevel: CefrLevel;
  goals: Goal[];
  voiceEnabled: boolean;
}

export function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [form, setForm] = useState(profile);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dirty = JSON.stringify(form) !== JSON.stringify(profile);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus("idle");
  };

  async function save() {
    setStatus("saving");
    try {
      await postJson("/api/profile", { ...form, explainInNative: form.explainInNative && Boolean(form.nativeLanguage) }, "PATCH");
      setStatus("saved");
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <Card className="flex flex-col gap-5">
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="size-5" /> Learning profile
        </CardTitle>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Name</span>
          <input
            value={form.name ?? ""}
            onChange={(e) => set("name", e.target.value || null)}
            className="h-11 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Current level</span>
          <select
            value={form.cefrLevel}
            onChange={(e) => set("cefrLevel", e.target.value as CefrLevel)}
            className="h-11 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary"
          >
            {CEFR_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l} — {CEFR_DESCRIPTIONS[l].split(" — ")[0]}
              </option>
            ))}
          </select>
          <Link href="/onboarding" className="text-sm font-semibold text-primary">
            Re-take placement test
          </Link>
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-semibold">Goals</legend>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => {
              const on = form.goals.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("goals", on ? form.goals.filter((x) => x !== g) : [...form.goals, g])}
                  className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold", on ? "border-primary bg-primary-soft text-primary" : "border-border")}
                >
                  {on ? <Check className="mr-1 inline size-3.5" /> : null}
                  {GOAL_LABELS[g].label}
                </button>
              );
            })}
          </div>
        </fieldset>
      </Card>

      <Card className="flex flex-col gap-5">
        <CardTitle className="flex items-center gap-2">
          <Languages className="size-5" /> Explanations & audio
        </CardTitle>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Native language</span>
          <select
            value={form.nativeLanguage ?? ""}
            onChange={(e) => set("nativeLanguage", e.target.value || null)}
            className="h-11 rounded-xl border border-border bg-background px-3 outline-none focus:border-primary"
          >
            <option value="">Prefer not to say</option>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <Toggle
          label="Explain hard grammar in my native language"
          help="Examples always stay in English."
          checked={form.explainInNative && Boolean(form.nativeLanguage)}
          disabled={!form.nativeLanguage}
          onChange={(v) => set("explainInNative", v)}
        />
        <Toggle
          icon={<Volume2 className="size-4" />}
          label="Voice replies"
          help="Read tutor messages aloud automatically."
          checked={form.voiceEnabled}
          onChange={(v) => set("voiceEnabled", v)}
        />
      </Card>

      {dirty || status !== "idle" ? (
        <div className="sticky bottom-20 z-30 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-lg lg:bottom-4">
          <span className="text-sm">
            {status === "saved" ? "Saved." : status === "error" ? "Couldn't save. Try again." : "You have unsaved profile changes."}
          </span>
          <div className="flex gap-2">
            {dirty ? (
              <Button variant="ghost" size="sm" onClick={() => setForm(profile)}>
                Discard
              </Button>
            ) : null}
            <Button size="sm" onClick={save} loading={status === "saving"} disabled={!dirty}>
              Save
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Toggle({
  label,
  help,
  icon,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  help?: string;
  icon?: React.ReactNode;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4", disabled && "opacity-50")}>
      <span>
        <span className="flex items-center gap-1.5 font-semibold">
          {icon}
          {label}
        </span>
        {help ? <span className="text-sm text-muted-foreground">{help}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-primary" : "bg-muted")}
      >
        <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
      </button>
    </div>
  );
}
