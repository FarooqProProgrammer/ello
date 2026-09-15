import { READING_THEMES } from "@repo/activities";
import { listSessionsWithData } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { Headphones } from "lucide-react";
import { HistoryList } from "@/components/history-list";
import { ThemePicker } from "@/components/theme-picker";
import { getEffectiveEnv } from "@/lib/ai-env";
import { setupMessageFor } from "../tutor/data";

export default async function ListeningPage() {
  const user = await getCurrentUser();
  const [history, env] = await Promise.all([listSessionsWithData(user.id, "listening", 20), getEffectiveEnv(user.id)]);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 lg:py-10">
      <header>
        <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
          <Headphones className="size-7 text-primary" /> Listening
        </h1>
        <p className="mt-1 text-muted-foreground">Listen to a real-life dialogue, answer questions, then write what you hear.</p>
      </header>
      <ThemePicker
        themes={READING_THEMES}
        endpoint="/api/listening"
        hrefFor={(id) => `/listening/${id}`}
        submitLabel="Create dialogue"
        busyLabel="Writing the dialogue…"
        setupMessage={setupMessageFor(env)}
      />
      <HistoryList
        title="Your listening tasks"
        items={history.map((h) => ({
          id: h.id,
          href: `/listening/${h.id}`,
          title: h.title,
          meta: `${h.topicId ?? "Listening"} · ${h.startedAt.toLocaleDateString("en", { month: "short", day: "numeric" })}`,
          score: h.score,
        }))}
      />
    </main>
  );
}
