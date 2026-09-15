import type { WeeklyReport } from "@repo/activities";
import { isoWeekKey, SKILLS, translationLanguage, type WeeklyStats } from "@repo/core";
import { listSessionsWithData } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { REPORT_ACTIVITY } from "@repo/jobs";
import { Card, CardTitle, Chip, cn, EmptyState } from "@repo/ui";
import { ArrowDown, ArrowUp, BarChart3, CalendarDays, Flame, MessageCircle, Sparkles, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { humanizeCategory, SKILL_LABELS } from "@/lib/labels";
import { GenerateReportButton } from "./generate-button";

const ACTIVITY_LABELS: Record<string, string> = {
  "tutor-chat": "Chats",
  grammar: "Grammar",
  daily: "Daily reviews",
  writing: "Writing",
  reading: "Reading",
  listening: "Listening",
  pronunciation: "Pronunciation",
  flashcards: "Flashcard reviews",
  "vocab-quiz": "Vocab quizzes",
  idioms: "Idiom packs",
  mistakes: "Mistake practice",
  "ielts-speaking": "IELTS speaking",
  placement: "Placement",
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const user = await getCurrentUser();
  const reports = await listSessionsWithData(user.id, REPORT_ACTIVITY, 12);
  const selected = reports.find((r) => r.id === id) ?? reports[0];
  const data = selected?.data as { stats: WeeklyStats; report: WeeklyReport } | undefined;
  const native = translationLanguage(user.nativeLanguage);
  const thisWeek = isoWeekKey();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
            <BarChart3 className="size-7 text-primary" /> Weekly reports
          </h1>
          <p className="mt-1 text-muted-foreground">Written by your AI coach every Sunday from your real activity.</p>
        </div>
        <GenerateReportButton hasThisWeek={reports.some((r) => r.title === thisWeek)} />
      </header>

      {!data || !selected ? (
        <Card>
          <EmptyState icon={<BarChart3 className="size-5" />} title="No report yet" body="Your first report arrives on Sunday — or generate one now." />
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-3 border-primary/40">
            <p className="font-mono text-xs text-muted-foreground">
              {selected.title} · {data.stats.from} → {data.stats.to}
            </p>
            <h2 className="font-display text-3xl font-extrabold leading-tight">{data.report.headline}</h2>
            <p className="text-[17px] leading-relaxed">{data.report.summary}</p>
            {data.report.encouragementNative ? (
              <p lang={native.code} dir={native.rtl ? "rtl" : "ltr"} className={cn("text-muted-foreground", native.code === "ur" && "font-urdu leading-[2.1]")}>
                {data.report.encouragementNative}
              </p>
            ) : null}
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: CalendarDays, label: "Active days", value: `${data.stats.activeDays}/7` },
              { icon: Flame, label: "Streak", value: String(data.stats.streak) },
              { icon: MessageCircle, label: "Messages", value: String(data.stats.messagesSent) },
              { icon: Sparkles, label: "New words", value: String(data.stats.newWords) },
            ].map((t) => (
              <Card key={t.label} className="flex flex-col gap-1 p-3 md:p-4">
                <t.icon className="size-4 text-muted-foreground" aria-hidden />
                <span className="font-display text-2xl font-extrabold">{t.value}</span>
                <span className="text-xs text-muted-foreground">{t.label}</span>
              </Card>
            ))}
          </div>

          <Card className="flex flex-col gap-3">
            <CardTitle>Skills this week</CardTitle>
            <ul className="divide-y divide-border">
              {SKILLS.filter((s) => data.stats.skillAverages[s] !== undefined || data.stats.previousSkillAverages[s] !== undefined).map((skill) => {
                const now = data.stats.skillAverages[skill];
                const before = data.stats.previousSkillAverages[skill];
                const delta = now !== undefined && before !== undefined ? now - before : null;
                return (
                  <li key={skill} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="font-semibold">{SKILL_LABELS[skill]}</span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono">{now ?? "—"}</span>
                      {delta !== null && delta !== 0 ? (
                        <span className={cn("flex items-center font-mono text-xs", delta > 0 ? "text-correct" : "text-mistake")}>
                          {delta > 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                          {Math.abs(delta)}
                        </span>
                      ) : (
                        <span className="w-8" />
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            {Object.keys(data.stats.sessionsByActivity).length ? (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(data.stats.sessionsByActivity).map(([activity, n]) => (
                  <Chip key={activity}>
                    {ACTIVITY_LABELS[activity] ?? activity} · {n}
                  </Chip>
                ))}
              </div>
            ) : null}
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="flex flex-col gap-2">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="size-5 text-streak" /> Wins
              </CardTitle>
              <ul className="list-disc space-y-1 pl-5 text-sm">{data.report.wins.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </Card>
            <Card className="flex flex-col gap-2">
              <CardTitle className="flex items-center gap-2">
                <Target className="size-5 text-primary" /> Goals for next week
              </CardTitle>
              <ul className="list-disc space-y-1 pl-5 text-sm">{data.report.goals.map((g, i) => <li key={i}>{g}</li>)}</ul>
            </Card>
          </div>

          <Card className="flex flex-col gap-3">
            <CardTitle>Focus areas</CardTitle>
            {data.report.focusAreas.map((f, i) => (
              <div key={i} className="rounded-xl border border-border p-3">
                <p className="font-semibold">{f.title}</p>
                <p className="text-sm text-muted-foreground">{f.why}</p>
                <p className="mt-1 text-sm">
                  <span className="font-semibold text-primary">Next: </span>
                  {f.action}
                </p>
              </div>
            ))}
            {data.stats.topMistakes.length ? (
              <p className="text-sm text-muted-foreground">
                Top mistakes: {data.stats.topMistakes.map((m) => `${humanizeCategory(m.category)} (${m.count})`).join(", ")} ·{" "}
                <Link href="/mistakes" className="font-semibold text-primary">
                  Open notebook
                </Link>
              </p>
            ) : null}
          </Card>

          {reports.length > 1 ? (
            <Card className="flex flex-col gap-2">
              <CardTitle>Earlier reports</CardTitle>
              <div className="flex flex-wrap gap-2">
                {reports.map((r) => (
                  <Link key={r.id} href={`/reports?id=${r.id}`}>
                    <Chip tone={r.id === selected.id ? "primary" : "neutral"} className="px-3 py-1.5">
                      {r.title}
                    </Chip>
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}
        </>
      )}
    </main>
  );
}
