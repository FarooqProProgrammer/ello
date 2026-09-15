import { CEFR_DESCRIPTIONS, CEFR_LEVELS, GRAMMAR_TOPICS, recommendGrammarTopics } from "@repo/core";
import { getGrammarProgress, getWeakAreas } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { Card, cn, LevelStamp, ProgressBar } from "@repo/ui";
import { BookOpen, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";

export default async function GrammarPage() {
  const user = await getCurrentUser();
  const [progress, weakAreas] = await Promise.all([getGrammarProgress(user.id), getWeakAreas(user.id)]);
  const recommendations = recommendGrammarTopics(user.cefrLevel, weakAreas, progress);
  const started = Object.values(progress).filter((p) => p.attempts > 0).length;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-6 md:px-6 lg:px-8 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Grammar</h1>
          <p className="mt-1 text-muted-foreground">
            AI lessons written for your level, with practice that adapts to your mistakes.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {started} of {GRAMMAR_TOPICS.length} topics started
        </p>
      </header>

      {recommendations.length ? (
        <section aria-labelledby="recommended-title">
          <h2 id="recommended-title" className="squiggle mb-4 inline-flex items-center gap-2 font-display text-xl font-bold">
            <Sparkles className="size-5 text-primary" /> Recommended for you
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {recommendations.map(({ topic, reason }) => (
              <li key={topic.id}>
                <Link
                  href={`/grammar/${topic.id}`}
                  className="flex h-full items-center gap-4 rounded-[var(--radius)] border-2 border-primary/30 bg-primary-soft/60 p-4 transition-colors hover:border-primary"
                >
                  <LevelStamp level={topic.level} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{topic.title}</span>
                    <span className="text-sm text-muted-foreground">{reason}</span>
                  </span>
                  <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <nav aria-label="Jump to level" className="flex flex-wrap gap-2">
        {CEFR_LEVELS.map((level) => (
          <a
            key={level}
            href={`#level-${level}`}
            className={cn(
              "rounded-full border px-3 py-1.5 font-mono text-sm",
              level === user.cefrLevel ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-muted",
            )}
          >
            {level}
          </a>
        ))}
      </nav>

      {CEFR_LEVELS.map((level) => {
        const topics = GRAMMAR_TOPICS.filter((t) => t.level === level);
        return (
          <section key={level} id={`level-${level}`} aria-labelledby={`level-${level}-title`} className="scroll-mt-6">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <LevelStamp level={level} size="lg" />
              <div>
                <h2 id={`level-${level}-title`} className="font-display text-lg font-bold">
                  {CEFR_DESCRIPTIONS[level].split(" — ")[0]}
                  {level === user.cefrLevel ? <span className="ml-2 text-sm font-semibold text-primary">· Your level</span> : null}
                </h2>
                <p className="text-sm text-muted-foreground">{CEFR_DESCRIPTIONS[level].split(" — ")[1]}</p>
              </div>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map((topic) => {
                const p = progress[topic.id];
                return (
                  <li key={topic.id}>
                    <Link href={`/grammar/${topic.id}`} className="block h-full">
                      <Card className="flex h-full flex-col gap-2 transition-colors hover:border-primary/50">
                        <span className="flex items-start justify-between gap-2">
                          <span className="font-semibold">{topic.title}</span>
                          <BookOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        </span>
                        <span className="flex-1 text-sm text-muted-foreground">{topic.summary}</span>
                        {p?.attempts ? (
                          <span className="flex items-center gap-2">
                            <ProgressBar
                              value={p.mastery}
                              color={p.mastery >= 80 ? "var(--correct)" : "var(--primary)"}
                              label={`${topic.title} mastery`}
                            />
                            <span className="font-mono text-xs text-muted-foreground">{Math.round(p.mastery)}%</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not started</span>
                        )}
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
