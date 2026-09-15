import { listVocab } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { ChevronLeft, ListChecks } from "lucide-react";
import Link from "next/link";
import { QuizView } from "./quiz-view";

export default async function DictionaryQuizPage() {
  const user = await getCurrentUser();
  const vocab = await listVocab(user.id);
  const due = vocab.filter((v) => v.due.getTime() <= Date.now()).length;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 lg:py-10">
      <Link href="/dictionary" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Dictionary
      </Link>
      <header>
        <h1 className="flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
          <ListChecks className="size-7 text-primary" /> Vocabulary quiz
        </h1>
        <p className="mt-1 text-muted-foreground">10 questions from your own dictionary: meanings, Urdu matches, gaps, and your own sentences.</p>
      </header>
      <QuizView wordCount={vocab.length} dueCount={due} />
    </main>
  );
}
