"use client";

import type { GrammarLesson } from "@repo/activities";
import type { CefrLevel, GrammarTopic } from "@repo/core";
import { Alert, Button, Card, CardTitle, cn, LevelStamp, ProgressBar, Skeleton } from "@repo/ui";
import { ArrowRight, ChevronLeft, Languages, Lightbulb, MessageCircle, RefreshCw, Volume2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PracticeRunner, type PracticeStart } from "@/components/practice-runner";
import { useSpeaker, type VoiceMode } from "@/components/voice";
import { ClientApiError, postJson } from "@/lib/client";
import type { TranslationLanguage } from "@/lib/labels";

interface Props {
  topic: GrammarTopic;
  learnerLevel: CefrLevel;
  initialLesson: GrammarLesson | null;
  mastery: number | null;
  voiceMode: VoiceMode;
  setupMessage: string | null;
  nativeLang: TranslationLanguage | null;
}

export function GrammarTopicView({ topic, learnerLevel, initialLesson, mastery, voiceMode, setupMessage, nativeLang }: Props) {
  const [lesson, setLesson] = useState<GrammarLesson | null>(initialLesson);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ClientApiError | null>(null);
  const [currentMastery, setCurrentMastery] = useState(mastery);
  const speaker = useSpeaker(voiceMode);
  const practiceRef = useRef<HTMLDivElement>(null);
  const ready = setupMessage === null;
  const plainTitle = topic.title.replace(/[“”]/g, "");

  const loadLesson = useCallback(
    async (regenerate: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const { lesson } = await postJson<{ lesson: GrammarLesson }>(`/api/grammar/${topic.id}/lesson`, { regenerate });
        setLesson(lesson);
      } catch (err) {
        setError(err instanceof ClientApiError ? err : new ClientApiError("Couldn't load the lesson."));
      } finally {
        setLoading(false);
      }
    },
    [topic.id],
  );

  useEffect(() => {
    if (!initialLesson && ready) void loadLesson(false);
  }, [initialLesson, loadLesson, ready]);

  const chatHref = `/tutor?topic=free&focus=${encodeURIComponent(plainTitle)}`;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 lg:py-10">
      <Link href="/grammar" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> All grammar topics
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <LevelStamp level={topic.level} />
          {topic.level !== learnerLevel ? <span className="text-xs text-muted-foreground">Explained for your level ({learnerLevel})</span> : null}
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">{topic.title}</h1>
        <p className="text-lg text-muted-foreground">{topic.summary}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => practiceRef.current?.scrollIntoView({ behavior: "smooth" })} disabled={!ready}>
            Practice now <ArrowRight className="size-4" />
          </Button>
          <Link href={chatHref}>
            <Button variant="secondary">
              <MessageCircle className="size-4" /> Practice in chat
            </Button>
          </Link>
          {currentMastery !== null ? (
            <span className="flex min-w-40 flex-1 items-center gap-2 text-sm">
              <ProgressBar value={currentMastery} color={currentMastery >= 80 ? "var(--correct)" : "var(--primary)"} label="Mastery" />
              <span className="font-mono text-muted-foreground">{Math.round(currentMastery)}%</span>
            </span>
          ) : null}
        </div>
      </header>

      {setupMessage ? (
        <Alert tone="streak" action={<Link href="/settings" className="font-semibold text-primary">Settings →</Link>}>
          {setupMessage}
        </Alert>
      ) : null}

      <section aria-label="Lesson" className="flex flex-col gap-4">
        {loading && !lesson ? <LessonSkeleton /> : null}
        {error ? (
          <Alert action={<Button size="sm" variant="secondary" onClick={() => loadLesson(false)}>Retry</Button>}>{error.message}</Alert>
        ) : null}
        {lesson ? (
          <>
            <Card className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <CardTitle>Overview</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => loadLesson(true)} loading={loading} title="Write a new version of this lesson">
                  <RefreshCw className="size-4" /> New version
                </Button>
              </div>
              <p className="text-[17px] leading-relaxed">{lesson.summary}</p>
            </Card>

            {lesson.rules.map((rule, i) => (
              <Card key={`${rule.title}-${i}`} className="flex flex-col gap-3">
                <h2 className="font-display text-lg font-bold">
                  <span className="mr-2 font-mono text-sm text-muted-foreground">{i + 1}</span>
                  {rule.title}
                </h2>
                <p className="leading-relaxed">{rule.explanation}</p>
                <ul className="flex flex-col gap-2">
                  {rule.examples.map((example, j) => {
                    const id = `rule-${i}-${j}`;
                    return (
                      <li key={id} className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
                        <button
                          type="button"
                          onClick={() => (speaker.playingId === id ? speaker.stop() : speaker.play(id, example))}
                          className={cn("grid size-8 shrink-0 place-items-center rounded-full hover:bg-card", speaker.playingId === id ? "text-primary" : "text-muted-foreground")}
                          aria-label={`Play: ${example}`}
                        >
                          <Volume2 className="size-4" />
                        </button>
                        <span className="text-[16px]">{example}</span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))}

            {lesson.commonMistakes.length ? (
              <Card className="flex flex-col gap-3">
                <CardTitle>Common mistakes</CardTitle>
                <ul className="flex flex-col gap-3">
                  {lesson.commonMistakes.map((m, i) => (
                    <li key={i} className="flex flex-col gap-1.5 border-b border-border pb-3 last:border-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-2 text-[16px]">
                        <span className="rounded bg-mistake-soft px-1.5 line-through decoration-mistake decoration-2">{m.wrong}</span>
                        <ArrowRight className="size-4 text-muted-foreground" aria-label="should be" />
                        <span className="rounded bg-correct-soft px-1.5 font-semibold">{m.right}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{m.why}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {nativeLang && lesson.nativeLanguageNote.trim() ? (
              <Card className="flex flex-col gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Languages className="size-5" /> In {nativeLang.name}
                </CardTitle>
                <p
                  lang={nativeLang.code}
                  dir={nativeLang.rtl ? "rtl" : "ltr"}
                  className={cn(nativeLang.code === "ur" ? "font-urdu text-[16px] leading-[2.2]" : "leading-relaxed")}
                >
                  {lesson.nativeLanguageNote}
                </p>
              </Card>
            ) : null}

            {lesson.tip ? (
              <div className="flex gap-3 rounded-[var(--radius)] border border-highlight bg-highlight-soft p-4">
                <Lightbulb className="size-5 shrink-0" aria-hidden />
                <p>
                  <span className="font-semibold">Tip: </span>
                  {lesson.tip}
                </p>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      <div ref={practiceRef} className="scroll-mt-6">
        <PracticeRunner
          title="Practice"
          description={`10 new AI questions on ${plainTitle}: multiple choice, fill the gap, fix the mistake, and word order.`}
          ready={ready}
          showMastery
          start={() => postJson<PracticeStart>(`/api/grammar/${topic.id}/practice`, {})}
          onFinished={(summary) => {
            if (summary.mastery !== null) setCurrentMastery(summary.mastery);
          }}
          doneActions={
            <>
              <Link href={chatHref}>
                <Button variant="secondary">
                  <MessageCircle className="size-4" /> Use it in a chat
                </Button>
              </Link>
              <Link href="/grammar">
                <Button variant="ghost">All topics</Button>
              </Link>
            </>
          }
        />
      </div>
    </main>
  );
}

function LessonSkeleton() {
  return (
    <Card className="flex flex-col gap-3" aria-busy="true" aria-label="Writing your lesson">
      <p className="text-sm text-muted-foreground">Writing a lesson for your level…</p>
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="mt-3 h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </Card>
  );
}
