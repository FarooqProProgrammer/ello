"use client";

import { CEFR_DESCRIPTIONS, CEFR_LEVELS, GOALS, type CefrLevel, type Goal } from "@repo/core";
import { Alert, Button, CEFR_COLOR, cn, LevelStamp, ProgressBar } from "@repo/ui";
import { Check, ChevronLeft, GraduationCap, Languages, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { postJson } from "@/lib/client";
import { GOAL_LABELS, LANGUAGES } from "@/lib/labels";

interface Question {
  id: string;
  level: CefrLevel;
  kind: string;
  prompt: string;
  passage?: string;
  options: string[];
}

type Step = "welcome" | "language" | "goals" | "start" | "test" | "pick-level" | "result";

interface Outcome {
  level: CefrLevel;
  outcome: { score: number; perLevel: Partial<Record<CefrLevel, { correct: number; total: number }>> } | null;
}

export function Onboarding({ questions, retake }: { questions: Question[]; retake: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(retake ? "start" : "welcome");
  const [name, setName] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState<string | null>(null);
  const [explainInNative, setExplainInNative] = useState(true);
  const [goals, setGoals] = useState<Goal[]>(["CONVERSATION"]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; selectedIndex: number }[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [chosenLevel, setChosenLevel] = useState<CefrLevel | null>(null);
  const [result, setResult] = useState<Outcome | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flow: Step[] = retake ? ["start", "test", "result"] : ["welcome", "language", "goals", "start", "test", "result"];
  const progress = useMemo(() => {
    if (step === "test") {
      const base = flow.indexOf("test");
      return ((base + qIndex / questions.length) / (flow.length - 1)) * 100;
    }
    const i = flow.indexOf(step === "pick-level" ? "test" : step);
    return (Math.max(0, i) / (flow.length - 1)) * 100;
  }, [flow, qIndex, questions.length, step]);

  async function submit(payload: { answers?: typeof answers; chosenLevel?: CefrLevel }) {
    setSaving(true);
    setError(null);
    try {
      const data = await postJson<Outcome>("/api/placement", { name, goals, nativeLanguage, explainInNative, ...payload }, "POST", { retries: 0 });
      setResult(data);
      setStep("result");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function answer() {
    const q = questions[qIndex];
    if (!q || selected === null) return;
    const next = [...answers, { questionId: q.id, selectedIndex: selected }];
    setAnswers(next);
    setSelected(null);
    // Stop early when the learner says "I don't know" to 2+ questions of a level — harder levels won't pass.
    if (qIndex + 1 >= questions.length || givingUp(next)) void submit({ answers: next });
    else setQIndex(qIndex + 1);
  }

  function givingUp(list: typeof answers) {
    const current = questions[qIndex]!.level;
    const atLevel = list.filter((a) => questions.find((q) => q.id === a.questionId)?.level === current);
    return atLevel.length === 3 && atLevel.filter((a) => a.selectedIndex === -1).length >= 2;
  }

  function back() {
    const i = flow.indexOf(step);
    if (step === "pick-level") setStep("start");
    else if (i > 0) setStep(flow[i - 1]!);
  }

  const cta = (() => {
    switch (step) {
      case "welcome":
        return { label: "Get started", onClick: () => setStep("language"), disabled: false };
      case "language":
        return { label: "Continue", onClick: () => setStep("goals"), disabled: false };
      case "goals":
        return { label: "Continue", onClick: () => setStep("start"), disabled: goals.length === 0 };
      case "test":
        return { label: "Continue", onClick: answer, disabled: selected === null };
      case "pick-level":
        return { label: "Save my level", onClick: () => chosenLevel && submit({ chosenLevel }), disabled: !chosenLevel };
      case "result":
        return {
          label: "Start learning",
          onClick: () => {
            router.push("/");
            router.refresh();
          },
          disabled: false,
        };
      default:
        return null;
    }
  })();

  const q = questions[qIndex];

  return (
    <div className="flex min-h-dvh flex-col">
      {step !== "result" ? (
        <header className="mx-auto flex w-full max-w-xl items-center gap-3 px-4 py-4">
          <button
            type="button"
            onClick={back}
            className={cn("grid size-10 place-items-center rounded-full hover:bg-muted", flow.indexOf(step) <= 0 && step !== "pick-level" && "invisible")}
            aria-label="Back"
          >
            <ChevronLeft className="size-5" />
          </button>
          <ProgressBar value={progress} className="h-2.5 flex-1" label="Onboarding progress" />
          {retake ? (
            <Link href="/settings" className="grid size-10 place-items-center rounded-full hover:bg-muted" aria-label="Close">
              <X className="size-5" />
            </Link>
          ) : (
            <span className="size-10" />
          )}
        </header>
      ) : null}

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-32 pt-4">
        {step === "welcome" ? (
          <section className="flex flex-col gap-6 pt-8">
            <span className="grid size-16 place-items-center rounded-full bg-primary font-display text-4xl font-extrabold text-primary-foreground">“</span>
            <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight">
              Speak English with <span className="highlighter">confidence</span>.
            </h1>
            <p className="text-lg text-muted-foreground">
              Chat with your AI tutor, get friendly corrections, and remember new words with smart flashcards.
            </p>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">What should I call you?</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="h-12 rounded-xl border border-border bg-card px-4 text-base outline-none focus:border-primary"
              />
            </label>
          </section>
        ) : null}

        {step === "language" ? (
          <section>
            <TutorBubble>What&apos;s your native language?</TutorBubble>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LANGUAGES.map((l) => (
                <OptionButton key={l.code} selected={nativeLanguage === l.code} onClick={() => setNativeLanguage(nativeLanguage === l.code ? null : l.code)}>
                  {l.name}
                </OptionButton>
              ))}
            </div>
            <label className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <input
                type="checkbox"
                checked={explainInNative}
                disabled={!nativeLanguage}
                onChange={(e) => setExplainInNative(e.target.checked)}
                className="mt-1 size-5 accent-[var(--primary)]"
              />
              <span>
                <span className="flex items-center gap-1.5 font-semibold">
                  <Languages className="size-4" /> Explain hard grammar in my language
                </span>
                <span className="text-sm text-muted-foreground">Examples always stay in English.</span>
              </span>
            </label>
          </section>
        ) : null}

        {step === "goals" ? (
          <section>
            <TutorBubble>What do you want to use English for?</TutorBubble>
            <div className="mt-5 flex flex-col gap-2">
              {GOALS.map((g) => {
                const on = goals.includes(g);
                return (
                  <OptionButton key={g} selected={on} onClick={() => setGoals(on ? goals.filter((x) => x !== g) : [...goals, g])}>
                    <span className="flex flex-1 flex-col text-left">
                      <span className="font-semibold">{GOAL_LABELS[g].label}</span>
                      <span className="text-sm text-muted-foreground">{GOAL_LABELS[g].hint}</span>
                    </span>
                    {on ? <Check className="size-5 text-primary" /> : null}
                  </OptionButton>
                );
              })}
            </div>
          </section>
        ) : null}

        {step === "start" ? (
          <section>
            <TutorBubble>{retake ? "Let's check your level again." : "Let's find the right level for you."}</TutorBubble>
            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setQIndex(0);
                  setAnswers([]);
                  setStep("test");
                }}
                className="flex items-center gap-4 rounded-[var(--radius)] border-2 border-primary bg-primary-soft p-5 text-left"
              >
                <GraduationCap className="size-8 text-primary" />
                <span className="flex-1">
                  <span className="block font-semibold">Find my level</span>
                  <span className="text-sm text-muted-foreground">Quick test · about 4 minutes</span>
                </span>
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">Recommended</span>
              </button>
              <button type="button" onClick={() => setStep("pick-level")} className="flex items-center gap-4 rounded-[var(--radius)] border border-border bg-card p-5 text-left">
                <Sparkles className="size-8 text-muted-foreground" />
                <span className="flex-1">
                  <span className="block font-semibold">I know my level</span>
                  <span className="text-sm text-muted-foreground">Choose from A1 to C2</span>
                </span>
              </button>
            </div>
          </section>
        ) : null}

        {step === "pick-level" ? (
          <section>
            <TutorBubble>Which level describes you best?</TutorBubble>
            <div className="mt-5 flex flex-col gap-2">
              {CEFR_LEVELS.map((l) => (
                <OptionButton key={l} selected={chosenLevel === l} onClick={() => setChosenLevel(l)}>
                  <LevelStamp level={l} />
                  <span className="flex-1 text-left text-sm">{CEFR_DESCRIPTIONS[l]}</span>
                </OptionButton>
              ))}
            </div>
          </section>
        ) : null}

        {step === "test" && q ? (
          <section>
            <p className="mb-3 font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Question {qIndex + 1} of {questions.length} · {q.kind}
            </p>
            {q.passage ? <div className="mb-4 rounded-xl border border-border bg-card p-4 text-[17px] leading-relaxed">{q.passage}</div> : null}
            <TutorBubble>{q.prompt}</TutorBubble>
            <div className="mt-5 flex flex-col gap-2">
              {q.options.map((option, i) => (
                <OptionButton key={option} selected={selected === i} onClick={() => setSelected(i)}>
                  <span className="grid size-7 place-items-center rounded-lg border border-border font-mono text-xs">{String.fromCharCode(65 + i)}</span>
                  <span className="flex-1 text-left text-[17px]">{option}</span>
                </OptionButton>
              ))}
              <OptionButton selected={selected === -1} onClick={() => setSelected(-1)}>
                <span className="flex-1 text-left text-muted-foreground">I don&apos;t know</span>
              </OptionButton>
            </div>
          </section>
        ) : null}

        {step === "result" && result ? (
          <section className="flex flex-col items-center gap-6 pt-10 text-center">
            <p className="font-semibold text-muted-foreground">Your English level</p>
            <div
              className="grid size-48 place-items-center rounded-full"
              style={{ background: `radial-gradient(circle, color-mix(in srgb, ${CEFR_COLOR[result.level]} 45%, transparent) 0%, transparent 70%)` }}
            >
              <span className="font-display text-8xl font-extrabold tracking-tight">{result.level}</span>
            </div>
            <p className="max-w-sm text-lg">{CEFR_DESCRIPTIONS[result.level]}</p>
            <ol className="flex w-full max-w-sm gap-1" aria-label="CEFR scale">
              {CEFR_LEVELS.map((l) => (
                <li key={l} className="flex flex-1 flex-col items-center gap-1">
                  <span
                    className="h-2.5 w-full rounded-full"
                    style={{ background: CEFR_LEVELS.indexOf(l) <= CEFR_LEVELS.indexOf(result.level) ? CEFR_COLOR[l] : "var(--muted)" }}
                  />
                  <span className={cn("font-mono text-xs", l === result.level ? "font-bold" : "text-muted-foreground")}>{l}</span>
                </li>
              ))}
            </ol>
            {result.outcome ? <p className="text-sm text-muted-foreground">You answered {result.outcome.score}% correctly.</p> : null}
            <p className="text-sm text-muted-foreground">Your level updates automatically as you improve.</p>
          </section>
        ) : null}

        {error ? <Alert className="mt-6">{error}</Alert> : null}
      </main>

      {cta ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/95 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-4 backdrop-blur">
          <div className="mx-auto max-w-xl">
            <Button size="lg" onClick={cta.onClick} disabled={cta.disabled} loading={saving}>
              {cta.label}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TutorBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-display font-extrabold text-primary-foreground" aria-hidden>
        “
      </span>
      <h1 className="rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 font-display text-2xl font-bold leading-snug tracking-tight">{children}</h1>
    </div>
  );
}

function OptionButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-xl border-2 bg-card px-4 py-3 text-left font-medium transition-colors",
        selected ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}
