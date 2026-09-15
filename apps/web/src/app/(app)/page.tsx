import { CEFR_DESCRIPTIONS, isoWeekKey, localClock, recommendGrammarTopics, SKILLS } from "@repo/core";
import { countDueVocab, findSessionByTitle, getGrammarProgress, getProgress, syncAchievements } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { REPORT_ACTIVITY } from "@repo/jobs";
import { Button, Card, CardTitle, Chip, EmptyState, LevelStamp, ProgressBar } from "@repo/ui";
import { BarChart3, BookOpen, CalendarCheck, Check, ChevronRight, Flame, Layers, MessageCircle, PenLine, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { greeting, humanizeCategory, SKILL_LABELS } from "@/lib/labels";

export default async function HomePage() {
  const user = await getCurrentUser();
  const [progress, due, grammarProgress, weekReport, badges] = await Promise.all([
    getProgress(user.id),
    countDueVocab(user.id),
    getGrammarProgress(user.id),
    findSessionByTitle(user.id, REPORT_ACTIVITY, isoWeekKey()),
    syncAchievements(user.id),
  ]);
  const localHour = Number(localClock(new Date(), user.timeZone).hhmm.slice(0, 2));
  const reportHeadline = (weekReport?.data as { report?: { headline?: string } } | null)?.report?.headline ?? null;
  const grammarPick = recommendGrammarTopics(user.cefrLevel, progress.weakAreas, grammarProgress, 1)[0];

  const today = new Date().toISOString().slice(0, 10);
  const practicedToday = progress.activeDays.includes(today);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return { key, label: d.toLocaleDateString("en", { weekday: "narrow" }), done: progress.activeDays.includes(key), isToday: key === today };
  });
  const topWeak = progress.weakAreas[0];

  const plan = [
    { href: "/daily", icon: CalendarCheck, tone: "bg-correct-soft", title: "Daily review", meta: "~10 min · flashcards + your own mistakes" },
    due > 0
      ? { href: "/review", icon: Layers, tone: "bg-highlight-soft", title: `Review ${due} card${due === 1 ? "" : "s"}`, meta: `~${Math.max(2, Math.ceil(due / 4))} min` }
      : null,
    { href: "/tutor?topic=daily", icon: MessageCircle, tone: "bg-primary-soft", title: "Talk about your day", meta: "~5 min" },
    grammarPick
      ? {
          href: `/grammar/${grammarPick.topic.id}`,
          icon: BookOpen,
          tone: "bg-streak-soft",
          title: `Grammar: ${grammarPick.topic.title}`,
          meta: `~8 min · ${grammarPick.reason}`,
        }
      : null,
    topWeak
      ? {
          href: `/tutor?topic=free&focus=${encodeURIComponent(topWeak.category)}`,
          icon: PenLine,
          tone: "bg-mistake-soft",
          title: `Fix your top mistake: ${humanizeCategory(topWeak.category)}`,
          meta: `${topWeak.count} recent`,
        }
      : { href: "/tutor?topic=work", icon: Target, tone: "bg-correct-soft", title: "Role-play a work meeting", meta: "~5 min" },
  ].filter((x) => x !== null);

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8 lg:py-10">
      <div className="flex flex-col gap-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{greeting()}</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">{user.name ?? "Learner"}</h1>
          </div>
          <Link href="/progress" className="flex items-center gap-2 text-right">
            <span className="hidden text-xs text-muted-foreground sm:block">{CEFR_DESCRIPTIONS[user.cefrLevel].split(" — ")[0]}</span>
            <LevelStamp level={user.cefrLevel} size="lg" />
          </Link>
        </header>

        {progress.streak > 0 && !practicedToday && localHour >= 18 ? (
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border-l-4 border-l-streak bg-streak-soft px-4 py-3">
            <Flame className="size-5 text-streak" aria-hidden />
            <p className="min-w-0 flex-1 font-semibold">Keep your {progress.streak}-day streak — 5 minutes is enough.</p>
            <Link href="/review" className="pressable rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Quick review
            </Link>
          </div>
        ) : null}

        <section aria-labelledby="plan-title">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="plan-title" className="squiggle font-display text-xl font-bold">
              Today&apos;s plan
            </h2>
            {practicedToday ? <Chip tone="correct"><Check className="size-3" /> Practiced today</Chip> : null}
          </div>
          <ul className="flex flex-col gap-3">
            {plan.map((item, i) => (
              <li key={item.title}>
                <Link href={item.href} className="group flex items-center gap-4 rounded-[var(--radius)] border border-border bg-card p-4 transition-colors hover:border-primary/40">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${item.tone}`}>
                    <item.icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{item.title}</span>
                    <span className="text-sm text-muted-foreground">{item.meta}</span>
                  </span>
                  {i === 0 ? (
                    <span className="pressable hidden rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:inline">Start</span>
                  ) : (
                    <ChevronRight className="size-5 text-muted-foreground group-hover:text-foreground" aria-hidden />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <Card>
          <CardTitle className="mb-3">Watch out for</CardTitle>
          {progress.weakAreas.length === 0 ? (
            <EmptyState
              icon={<PenLine className="size-5" />}
              title="No patterns yet"
              body="We'll spot your common mistakes after your first chat."
              action={
                <Link href="/tutor">
                  <Button size="sm">Start a chat</Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {progress.weakAreas.slice(0, 4).map((w) => (
                <li key={`${w.type}-${w.category}`} className="flex items-center gap-3 py-3">
                  <span className="grid size-9 place-items-center rounded-full bg-mistake-soft font-mono text-sm">{w.count}</span>
                  <span className="flex-1">
                    <span className="block font-semibold">{humanizeCategory(w.category)}</span>
                    <span className="text-xs text-muted-foreground">{w.type.toLowerCase()} · last 30 days</span>
                  </span>
                  <Link href={`/tutor?topic=free&focus=${encodeURIComponent(w.category)}`}>
                    <Chip tone="primary">Practice</Chip>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <aside className="flex flex-col gap-6">
        {weekReport ? (
          <Link href={`/reports?id=${weekReport.id}`}>
            <Card className="flex items-center gap-3 border-primary/40 bg-primary-soft/60 transition-colors hover:border-primary">
              <BarChart3 className="size-6 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-wide text-primary">Weekly report ready</span>
                <span className="block truncate font-semibold">{reportHeadline ?? "See how your week went"}</span>
              </span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Card>
          </Link>
        ) : null}
        {badges.newlyEarned.length ? (
          <Link href="/achievements">
            <Card className="flex items-center gap-3 border-streak/50 bg-streak-soft transition-colors hover:border-streak">
              <Trophy className="size-6 shrink-0 text-streak" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold uppercase tracking-wide text-streak">New badge!</span>
                <span className="block truncate font-semibold">{badges.newlyEarned.map((b) => b.title).join(", ")}</span>
              </span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Card>
          </Link>
        ) : null}
        <Card>
          <div className="flex items-center gap-3">
            <Flame className={`size-9 ${progress.streak > 0 ? "text-streak" : "text-muted-foreground"}`} aria-hidden />
            <div>
              <p className="font-display text-4xl font-extrabold leading-none">{progress.streak}</p>
              <p className="text-sm text-muted-foreground">{progress.streak === 0 ? "Start your streak today" : "day streak"}</p>
            </div>
          </div>
          <ol className="mt-4 grid grid-cols-7 gap-1" aria-label="Last 7 days">
            {week.map((d) => (
              <li key={d.key} className="flex flex-col items-center gap-1">
                <span
                  className={`grid size-8 place-items-center rounded-full text-xs ${
                    d.done ? "bg-streak text-white" : d.isToday ? "border-2 border-streak" : "bg-muted"
                  }`}
                  aria-label={`${d.key}: ${d.done ? "practiced" : "no practice"}`}
                >
                  {d.done ? <Check className="size-4" /> : null}
                </span>
                <span className="text-[11px] text-muted-foreground">{d.label}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Flashcards due</p>
              <p className="font-display text-4xl font-extrabold">{due}</p>
            </div>
            <Layers className="size-6 text-muted-foreground" aria-hidden />
          </div>
          {due > 0 ? (
            <Link href="/review" className="mt-3 block">
              <Button className="w-full">Review now</Button>
            </Link>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">All caught up. New words from your chats land here.</p>
          )}
        </Card>

        <Card>
          <CardTitle className="mb-3">Skills</CardTitle>
          <ul className="flex flex-col gap-3">
            {SKILLS.map((s) => {
              const score = progress.latest[s];
              return (
                <li key={s}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{SKILL_LABELS[s]}</span>
                    <span className="font-mono text-muted-foreground">{score === null ? "—" : Math.round(score)}</span>
                  </div>
                  <ProgressBar value={score ?? 0} label={`${SKILL_LABELS[s]} score`} />
                </li>
              );
            })}
          </ul>
          <Link href="/progress" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            See progress <ChevronRight className="size-4" />
          </Link>
        </Card>
      </aside>
    </main>
  );
}
