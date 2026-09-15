import { WRITING_TYPES } from "@repo/activities";
import { listSessionsWithData } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { Card, CardTitle } from "@repo/ui";
import { ChevronRight, PenLine } from "lucide-react";
import Link from "next/link";
import { getEffectiveEnv } from "@/lib/ai-env";
import { setupMessageFor } from "../tutor/data";
import { WritingForm } from "./writing-form";

export default async function WritingPage({ searchParams }: { searchParams: Promise<{ type?: string; task?: string }> }) {
  const { type, task } = await searchParams;
  const user = await getCurrentUser();
  const [history, env] = await Promise.all([listSessionsWithData(user.id, "writing", 30), getEffectiveEnv(user.id)]);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 lg:py-10">
      <header>
        <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
          <PenLine className="size-7 text-primary" /> Writing coach
        </h1>
        <p className="mt-1 text-muted-foreground">
          Paste an email, essay or message. Get corrections, a better version, and what to study next.
        </p>
      </header>

      <WritingForm
        types={WRITING_TYPES.map((t) => ({ id: t.id, label: t.label, hint: t.hint }))}
        setupMessage={setupMessageFor(env)}
        initialType={WRITING_TYPES.some((t) => t.id === type) ? type! : undefined}
        initialTask={task?.slice(0, 1000)}
      />

      {history.length ? (
        <Card className="flex flex-col gap-2">
          <CardTitle>Your past writing</CardTitle>
          <ul className="divide-y divide-border">
            {history.map((h) => {
              const type = WRITING_TYPES.find((t) => t.id === h.topicId);
              const band = (h.data as { feedback?: { ieltsBand?: number } } | null)?.feedback?.ieltsBand;
              return (
                <li key={h.id}>
                  <Link href={`/writing/${h.id}`} className="flex items-center gap-3 py-3 hover:text-primary">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{h.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {type?.label ?? "Writing"} · {h.startedAt.toLocaleDateString("en", { month: "short", day: "numeric" })}
                      </span>
                    </span>
                    <span className="font-mono text-sm">
                      {band ? `Band ${band}` : h.score !== null ? `${Math.round(h.score)}/100` : "—"}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}
    </main>
  );
}
