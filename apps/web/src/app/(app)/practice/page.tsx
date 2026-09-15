import { countDueVocab } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { Card } from "@repo/ui";
import {
  AudioLines,
  BarChart3,
  CloudOff,
  ListChecks,
  Trophy,
  BookMarked,
  BookOpen,
  BookOpenText,
  CalendarCheck,
  ChevronRight,
  GraduationCap,
  Headphones,
  Layers,
  MessageCircle,
  NotebookPen,
  PenLine,
  Quote,
} from "lucide-react";
import Link from "next/link";

export default async function PracticePage() {
  const user = await getCurrentUser();
  const due = await countDueVocab(user.id);

  const sections = [
    {
      title: "Every day",
      items: [
        { href: "/daily", icon: CalendarCheck, tone: "bg-correct-soft", title: "Daily review", body: "10 minutes built from your own mistakes" },
        { href: "/review", icon: Layers, tone: "bg-muted", title: "Flashcards", body: due ? `${due} card${due === 1 ? "" : "s"} due now` : "All caught up" },
        { href: "/mistakes", icon: NotebookPen, tone: "bg-mistake-soft", title: "Mistake notebook", body: "Every correction, grouped — practise until it sticks" },
        { href: "/reports", icon: BarChart3, tone: "bg-primary-soft", title: "Weekly report", body: "Your AI coach's summary of the week" },
        { href: "/achievements", icon: Trophy, tone: "bg-streak-soft", title: "Achievements", body: "Badges for building your English habit" },
        { href: "/offline-review", icon: CloudOff, tone: "bg-muted", title: "Offline flashcards", body: "Review without internet; syncs when you're back" },
      ],
    },
    {
      title: "Speaking & listening",
      items: [
        { href: "/tutor", icon: MessageCircle, tone: "bg-primary-soft", title: "Tutor chat", body: "Text or hands-free voice, with live corrections" },
        { href: "/pronunciation", icon: AudioLines, tone: "bg-primary-soft", title: "Pronunciation", body: "Say sentences and see which words weren't clear" },
        { href: "/listening", icon: Headphones, tone: "bg-correct-soft", title: "Listening", body: "Real-life dialogues, questions and dictation" },
      ],
    },
    {
      title: "Reading & writing",
      items: [
        { href: "/reading", icon: BookOpenText, tone: "bg-highlight-soft", title: "Reading", body: "Texts at your level with a glossary and questions" },
        { href: "/writing", icon: PenLine, tone: "bg-mistake-soft", title: "Writing coach", body: "Emails, essays and IELTS Task 2 feedback" },
      ],
    },
    {
      title: "Grammar & vocabulary",
      items: [
        { href: "/grammar", icon: BookOpen, tone: "bg-streak-soft", title: "Grammar", body: "AI lessons and practice from A1 to C2" },
        { href: "/idioms", icon: Quote, tone: "bg-highlight-soft", title: "Idioms & phrasal verbs", body: "Themed packs with Urdu meanings and a quiz" },
        { href: "/dictionary", icon: BookMarked, tone: "bg-highlight-soft", title: "Dictionary", body: "Your words with Urdu meanings and usage" },
        { href: "/dictionary/quiz", icon: ListChecks, tone: "bg-correct-soft", title: "Vocabulary quiz", body: "10 questions from your own words" },
      ],
    },
    {
      title: "Exams",
      items: [{ href: "/ielts", icon: GraduationCap, tone: "bg-primary-soft", title: "IELTS preparation", body: "Speaking mock tests and Writing Task 2 bands" }],
    },
  ];

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-6 md:px-6 lg:px-8 lg:py-10">
      <header>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Practice</h1>
        <p className="mt-1 text-muted-foreground">Everything you can practise, in one place.</p>
      </header>
      {sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {section.items.map((a) => (
              <li key={a.href}>
                <Link href={a.href} className="block h-full">
                  <Card className="flex h-full items-center gap-4 transition-colors hover:border-primary/50">
                    <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${a.tone}`}>
                      <a.icon className="size-6" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{a.title}</span>
                      <span className="text-sm text-muted-foreground">{a.body}</span>
                    </span>
                    <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
