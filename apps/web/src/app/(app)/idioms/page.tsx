import { IDIOM_KINDS, IDIOM_THEMES } from "@repo/activities";
import { listSessionsWithData } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { Quote } from "lucide-react";
import { HistoryList } from "@/components/history-list";
import { ThemePicker } from "@/components/theme-picker";
import { getEffectiveEnv } from "@/lib/ai-env";
import { setupMessageFor } from "../tutor/data";

export default async function IdiomsPage() {
  const user = await getCurrentUser();
  const [history, env] = await Promise.all([listSessionsWithData(user.id, "idioms", 20), getEffectiveEnv(user.id)]);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 lg:py-10">
      <header>
        <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
          <Quote className="size-7 text-primary" /> Idioms & phrasal verbs
        </h1>
        <p className="mt-1 text-muted-foreground">Themed packs of 8 useful expressions with Urdu meanings, then a quick quiz.</p>
      </header>
      <ThemePicker
        themes={IDIOM_THEMES}
        endpoint="/api/idioms"
        hrefFor={(id) => `/idioms/${id}`}
        submitLabel="Create pack"
        busyLabel="Choosing expressions…"
        options={{
          name: "kind",
          label: "Type",
          choices: (Object.keys(IDIOM_KINDS) as (keyof typeof IDIOM_KINDS)[]).map((k) => ({ value: k, label: IDIOM_KINDS[k][0]!.toUpperCase() + IDIOM_KINDS[k].slice(1) })),
        }}
        setupMessage={setupMessageFor(env)}
      />
      <HistoryList
        title="Your packs"
        items={history.map((h) => ({
          id: h.id,
          href: `/idioms/${h.id}`,
          title: h.title,
          meta: h.startedAt.toLocaleDateString("en", { month: "short", day: "numeric" }),
          score: h.score,
        }))}
      />
    </main>
  );
}
