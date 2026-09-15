import { listSessionsWithData } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { Card, CardTitle } from "@repo/ui";
import { GraduationCap, Mic, PenLine } from "lucide-react";
import { HistoryList } from "@/components/history-list";
import { getEffectiveEnv } from "@/lib/ai-env";
import { setupMessageFor } from "../tutor/data";
import { WritingTaskButton } from "./writing-task-button";
import Link from "next/link";

export default async function IeltsPage() {
  const user = await getCurrentUser();
  const [speaking, env] = await Promise.all([listSessionsWithData(user.id, "ielts-speaking", 20), getEffectiveEnv(user.id)]);
  const setupMessage = setupMessageFor(env);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 lg:py-10">
      <header>
        <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
          <GraduationCap className="size-7 text-primary" /> IELTS preparation
        </h1>
        <p className="mt-1 text-muted-foreground">Realistic mock tests with examiner-style band scores.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <CardTitle className="flex items-center gap-2">
            <Mic className="size-5" /> Speaking mock test
          </CardTitle>
          <p className="text-sm text-muted-foreground">Part 1 questions, a Part 2 cue card, and Part 3 discussion. Answer by voice or text (about 12 minutes).</p>
          <Link href="/ielts/speaking" className={setupMessage ? "pointer-events-none opacity-50" : ""}>
            <span className="pressable inline-flex h-11 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground">Start speaking test</span>
          </Link>
        </Card>
        <Card className="flex flex-col gap-3">
          <CardTitle className="flex items-center gap-2">
            <PenLine className="size-5" /> Writing Task 2
          </CardTitle>
          <p className="text-sm text-muted-foreground">Get a real exam-style question, write 250+ words, and receive a band score for all four criteria.</p>
          <WritingTaskButton disabled={setupMessage !== null} />
        </Card>
      </div>

      <HistoryList
        title="Your speaking tests"
        items={speaking.map((s) => {
          const band = (s.data as { feedback?: { overallBand?: number } } | null)?.feedback?.overallBand;
          return {
            id: s.id,
            href: `/ielts/speaking?id=${s.id}`,
            title: s.title,
            meta: `${band ? `Band ${band}` : "Not finished"} · ${s.startedAt.toLocaleDateString("en", { month: "short", day: "numeric" })}`,
            score: s.score,
          };
        })}
      />
    </main>
  );
}
