import { WRITING_TYPES, type WritingFeedback } from "@repo/activities";
import { getActivitySession } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedbackView } from "./feedback-view";

export default async function WritingFeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const session = await getActivitySession(user.id, id, "writing");
  const data = session?.data as { type: string; text: string; taskPrompt: string | null; feedback: WritingFeedback } | null;
  if (!session || !data?.feedback) notFound();

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 lg:py-10">
      <Link href="/writing" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Writing coach
      </Link>
      <FeedbackView
        typeLabel={WRITING_TYPES.find((t) => t.id === data.type)?.label ?? "Writing"}
        isIelts={data.type === "ielts-task2"}
        text={data.text}
        taskPrompt={data.taskPrompt}
        feedback={data.feedback}
        dateLabel={session.startedAt.toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}
      />
    </main>
  );
}
