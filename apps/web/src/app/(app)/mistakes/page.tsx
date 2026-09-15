import { GRAMMAR_TOPICS } from "@repo/core";
import { listMistakes } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { NotebookPen } from "lucide-react";
import { getEffectiveEnv } from "@/lib/ai-env";
import { setupMessageFor } from "../tutor/data";
import { MistakeNotebook, type NotebookMistake } from "./mistake-notebook";

const ACTIVITY_LINK: Record<string, (id: string) => string> = {
  "tutor-chat": (id) => `/tutor/${id}`,
  writing: (id) => `/writing/${id}`,
};

export default async function MistakesPage() {
  const user = await getCurrentUser();
  const [rows, env] = await Promise.all([listMistakes(user.id), getEffectiveEnv(user.id)]);

  const mistakes: NotebookMistake[] = rows.map((m) => ({
    id: m.id,
    type: m.type,
    category: m.category,
    original: m.original,
    corrected: m.corrected,
    explanation: m.explanation,
    createdAt: m.createdAt.toISOString(),
    sourceLabel: m.session.activityId === "tutor-chat" ? "Chat" : m.session.activityId === "writing" ? "Writing" : m.session.activityId === "grammar" ? "Grammar" : "Practice",
    sourceHref: ACTIVITY_LINK[m.session.activityId]?.(m.session.id) ?? null,
    topicId: GRAMMAR_TOPICS.find((t) => t.categories.includes(m.category))?.id ?? null,
  }));

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8 lg:py-10">
      <header>
        <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
          <NotebookPen className="size-7 text-primary" /> Mistake notebook
        </h1>
        <p className="mt-1 text-muted-foreground">Every correction from your chats, writing and practice. Practise a pattern until it sticks, then mark it learned.</p>
      </header>
      <MistakeNotebook mistakes={mistakes} setupMessage={setupMessageFor(env)} />
    </main>
  );
}
