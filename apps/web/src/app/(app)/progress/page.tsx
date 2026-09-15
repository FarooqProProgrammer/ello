import { CEFR_DESCRIPTIONS, CEFR_LEVELS, SKILLS } from "@repo/core";
import { getProgress } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { Card, CardTitle, CEFR_COLOR, EmptyState, LevelStamp } from "@repo/ui";
import { BarChart3, PenLine } from "lucide-react";
import Link from "next/link";
import { humanizeCategory, SKILL_LABELS } from "@/lib/labels";
import { Sparkline } from "./sparkline";

export default async function ProgressPage() {
  const user = await getCurrentUser();
  const progress = await getProgress(user.id);
  const maxMistakes = Math.max(1, ...progress.weakAreas.map((w) => w.count));
  const vocabTotal = Object.values(progress.vocab).reduce((a, b) => a + b, 0);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Progress</h1>
        <span className="flex gap-4">
          <Link href="/achievements" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
            Achievements →
          </Link>
          <Link href="/reports" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
            Weekly reports →
          </Link>
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-4">
          <p className="text-sm text-muted-foreground">Current level</p>
          <div className="mt-3 flex items-center gap-4">
            <div
              className="grid size-24 place-items-center rounded-full"
              style={{ background: `radial-gradient(circle, color-mix(in srgb, ${CEFR_COLOR[user.cefrLevel]} 40%, transparent), transparent 70%)` }}
            >
              <span className="font-display text-5xl font-extrabold">{user.cefrLevel}</span>
            </div>
            <p className="text-sm">{CEFR_DESCRIPTIONS[user.cefrLevel]}</p>
          </div>
          <ol className="mt-5 flex gap-1" aria-label="CEFR ladder">
            {CEFR_LEVELS.map((l) => (
              <li key={l} className="flex flex-1 flex-col items-center gap-1">
                <span
                  className="h-2 w-full rounded-full"
                  style={{ background: CEFR_LEVELS.indexOf(l) <= CEFR_LEVELS.indexOf(user.cefrLevel) ? CEFR_COLOR[l] : "var(--muted)" }}
                />
                <span className="font-mono text-[11px] text-muted-foreground">{l}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            Your level moves up after 5 strong sessions in a row. ·{" "}
            <Link href="/onboarding" className="font-semibold text-primary">
              Re-test
            </Link>
          </p>
        </Card>

        <Card className="lg:col-span-8">
          <div className="mb-4 flex items-baseline justify-between">
            <CardTitle>Skills · last 90 days</CardTitle>
            <span className="text-xs text-muted-foreground">
              {progress.streak} day streak · {progress.sessionsLast7Days} sessions this week
            </span>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SKILLS.map((skill) => {
              const points = progress.trends[skill];
              const latest = progress.latest[skill];
              const first = points[0]?.score;
              const last = points.at(-1)?.score;
              const delta = first !== undefined && last !== undefined && points.length > 1 ? Math.round(last - first) : null;
              return (
                <li key={skill} className="rounded-xl border border-border p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold">{SKILL_LABELS[skill]}</span>
                    <span className="font-display text-2xl font-extrabold">{latest === null ? "—" : Math.round(latest)}</span>
                  </div>
                  {points.length >= 2 ? (
                    <Sparkline label={SKILL_LABELS[skill]} points={points.map((p) => ({ score: p.score, at: p.recordedAt.toISOString() }))} />
                  ) : (
                    <p className="flex h-12 items-center text-xs text-muted-foreground">
                      {points.length === 0 ? "No data yet" : "Trend appears after 2 sessions"}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {delta === null ? " " : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)} since first session`}
                  </p>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="lg:col-span-6">
          <CardTitle className="mb-4">Mistake categories · 30 days</CardTitle>
          {progress.weakAreas.length === 0 ? (
            <EmptyState icon={<PenLine className="size-5" />} title="No mistakes logged" body="Chat with the tutor and your patterns will show up here." />
          ) : (
            <ul className="flex flex-col gap-3">
              {progress.weakAreas.map((w) => (
                <li key={`${w.type}-${w.category}`} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3">
                  <span className="truncate text-sm font-medium" title={humanizeCategory(w.category)}>
                    {humanizeCategory(w.category)}
                  </span>
                  <span className="h-3 overflow-hidden rounded-r bg-muted" title={`${w.count} mistakes`}>
                    <span className="block h-full rounded-r bg-mistake" style={{ width: `${(w.count / maxMistakes) * 100}%` }} />
                  </span>
                  <span className="font-mono text-sm text-muted-foreground">{w.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-6">
          <CardTitle className="mb-4">Vocabulary</CardTitle>
          {vocabTotal === 0 ? (
            <EmptyState icon={<BarChart3 className="size-5" />} title="No words yet" body="Add new words from your chats to start building your deck." />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ["NEW", "New"],
                  ["LEARNING", "Learning"],
                  ["RELEARNING", "Relearning"],
                  ["REVIEW", "Known"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="rounded-xl bg-muted p-3">
                  <p className="font-display text-3xl font-extrabold">{progress.vocab[key] ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            {vocabTotal} words total · <LevelStamp level={user.cefrLevel} /> level
          </p>
        </Card>
      </div>
    </main>
  );
}
