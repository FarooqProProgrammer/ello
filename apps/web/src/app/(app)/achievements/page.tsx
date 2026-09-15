import type { AchievementCategory } from "@repo/core";
import { syncAchievements } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { Card, cn, ProgressBar } from "@repo/ui";
import { Award, BookOpen, Flame, Lock, MessageCircle, Sparkles, Trophy } from "lucide-react";

const CATEGORY: Record<AchievementCategory, { label: string; icon: typeof Flame; tone: string }> = {
  streak: { label: "Habits", icon: Flame, tone: "bg-streak-soft text-streak" },
  words: { label: "Vocabulary", icon: Sparkles, tone: "bg-highlight-soft text-foreground" },
  speaking: { label: "Speaking", icon: MessageCircle, tone: "bg-primary-soft text-primary" },
  grammar: { label: "Grammar", icon: BookOpen, tone: "bg-correct-soft text-correct" },
  skills: { label: "Skills", icon: Award, tone: "bg-mistake-soft text-mistake" },
};

export default async function AchievementsPage() {
  const user = await getCurrentUser();
  const { achievements } = await syncAchievements(user.id);
  const earned = achievements.filter((a) => a.earned).length;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
            <Trophy className="size-7 text-streak" /> Achievements
          </h1>
          <p className="mt-1 text-muted-foreground">Badges for building a real English habit.</p>
        </div>
        <span className="font-mono text-sm text-muted-foreground">
          {earned}/{achievements.length} earned
        </span>
      </header>

      {(Object.keys(CATEGORY) as AchievementCategory[]).map((category) => {
        const items = achievements.filter((a) => a.def.category === category);
        const meta = CATEGORY[category];
        return (
          <section key={category} className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{meta.label}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((a) => (
                <li key={a.def.id}>
                  <Card className={cn("flex h-full flex-col gap-2", !a.earned && "opacity-80")}>
                    <div className="flex items-center gap-3">
                      <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", a.earned ? meta.tone : "bg-muted text-muted-foreground")}>
                        {a.earned ? <meta.icon className="size-5" /> : <Lock className="size-5" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{a.def.title}</span>
                        <span className="text-sm text-muted-foreground">{a.def.description}</span>
                      </span>
                    </div>
                    {a.earned ? (
                      <p className="text-xs text-muted-foreground">
                        Earned {a.earnedAt ? a.earnedAt.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }) : ""}
                      </p>
                    ) : (
                      <div className="mt-auto flex items-center gap-2 text-xs">
                        <ProgressBar value={(a.current / a.goal) * 100} label={`${a.def.title} progress`} />
                        <span className="font-mono text-muted-foreground">
                          {a.current}/{a.goal}
                        </span>
                      </div>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
