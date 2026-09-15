import { READING_LENGTHS, READING_THEMES } from "@repo/activities";
import { listSessionsWithData } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { BookOpenText } from "lucide-react";
import { HistoryList } from "@/components/history-list";
import { ThemePicker } from "@/components/theme-picker";
import { getEffectiveEnv } from "@/lib/ai-env";
import { setupMessageFor } from "../tutor/data";

export default async function ReadingPage() {
  const user = await getCurrentUser();
  const [history, env] = await Promise.all([listSessionsWithData(user.id, "reading", 20), getEffectiveEnv(user.id)]);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 lg:py-10">
      <header>
        <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
          <BookOpenText className="size-7 text-primary" /> Reading
        </h1>
        <p className="mt-1 text-muted-foreground">An AI-written text at your level, with a glossary and questions. Select any word to add it to your dictionary.</p>
      </header>
      <ThemePicker
        themes={READING_THEMES}
        endpoint="/api/reading"
        hrefFor={(id) => `/reading/${id}`}
        submitLabel="Write my text"
        busyLabel="Writing your text…"
        options={{
          name: "length",
          label: "Length",
          choices: (Object.keys(READING_LENGTHS) as (keyof typeof READING_LENGTHS)[]).map((k) => ({ value: k, label: `${k[0]!.toUpperCase()}${k.slice(1)} · ${READING_LENGTHS[k]}` })),
        }}
        setupMessage={setupMessageFor(env)}
      />
      <HistoryList
        title="Your readings"
        items={history.map((h) => ({
          id: h.id,
          href: `/reading/${h.id}`,
          title: h.title,
          meta: `${h.topicId ?? "Reading"} · ${h.startedAt.toLocaleDateString("en", { month: "short", day: "numeric" })}`,
          score: h.score,
        }))}
      />
    </main>
  );
}
