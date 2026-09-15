"use client";

import type { ReplyExplanation } from "@repo/activities";
import type { CefrLevel, ChatDifficulty } from "@repo/core";
import { Alert, Button, Chip, cn, LevelStamp } from "@repo/ui";
import {
  ArrowRight,
  BookMarked,
  Brain,
  Check,
  ChevronLeft,
  Languages,
  Lightbulb,
  LoaderCircle,
  Mic,
  RotateCcw,
  PenLine,
  Phone,
  PhoneOff,
  Plus,
  SendHorizontal,
  Sparkles,
  Square,
  Volume2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listenTurn, useDictation, useSpeaker, type VoiceMode } from "@/components/voice";
import { ChatList } from "./chat-list";
import type { ChatSummary, ScenarioOption } from "./data";
import { ScenarioPicker } from "./scenario-picker";
import { ClientApiError, postJson, toError } from "@/lib/client";
import { humanizeCategory, type TranslationLanguage } from "@/lib/labels";

interface Correction {
  type: string;
  category: string;
  original: string;
  corrected: string;
  explanation: string;
}

interface NewWord {
  term: string;
  definition: string;
  example?: string;
}

interface Analysis {
  status: "pending" | "done" | "error";
  corrections: Correction[];
  betterVersion?: string;
  newWords: NewWord[];
  score?: number | null;
  /** Facts the AI saved to memory from this message (live only). */
  memorySaved?: string[];
}

interface ChatItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  failed?: boolean;
  analysis?: Analysis;
  /** undefined = not translated yet, null = translation failed. */
  translation?: string | null;
  /** Tutor replies: words saved to the dictionary from this message. */
  saved?: { status: "pending" | "done" | "error"; words: { id: string; term: string; translation: string | null }[]; message?: string };
  /** Tutor replies: native-language explanation. */
  explanation?: { status: "pending" | "done" | "error"; data?: ReplyExplanation; message?: string; open?: boolean };
}

interface Props {
  level: CefrLevel;
  topics: { id: string; label: string; prompt: string }[];
  /** The learner's own scenarios (topic id = "custom:<id>"). */
  customScenarios: ScenarioOption[];
  initialTopic: string | null;
  focus: string | null;
  voiceMode: VoiceMode;
  voiceReplies: boolean;
  /** Why the chat can't run yet (e.g. a role has no provider key); null when ready. */
  setupMessage: string | null;
  /** Saved chats for the history list. */
  chats: ChatSummary[];
  /** A saved chat being reopened, or null for a new chat. */
  initialChat: InitialChat | null;
  /** Language shown under each English message. */
  translationLang: TranslationLanguage;
  /** Adaptive difficulty from recent message scores. */
  difficulty: ChatDifficulty;
}

export interface InitialChat {
  id: string;
  title: string | null;
  topicId: string;
  focus: string | null;
  items: ChatItem[];
}

let tempId = 0;
const nextTempId = () => `tmp-${++tempId}`;

export function TutorChat({ level, topics, customScenarios, initialTopic, focus, voiceMode, voiceReplies, setupMessage, chats, initialChat, translationLang, difficulty }: Props) {
  const router = useRouter();
  const providerReady = setupMessage === null;
  const [topicId, setTopicId] = useState<string | null>(initialChat?.topicId ?? initialTopic);
  const [sessionId, setSessionId] = useState<string | null>(initialChat?.id ?? null);
  const [items, setItems] = useState<ChatItem[]>(initialChat?.items ?? []);
  const chatTitle = initialChat?.title ?? null;
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ClientApiError | null>(null);
  const [panel, setPanel] = useState<"corrections" | "words">("corrections");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeCorrection, setActiveCorrection] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [autoSpeak, setAutoSpeak] = useState(voiceReplies);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const scoresRef = useRef<number[]>([]);
  const sessionRef = useRef<string | null>(initialChat?.id ?? null);

  const speaker = useSpeaker(voiceMode);
  const onDictated = useCallback((text: string) => setInput(text), []);
  const dictation = useDictation(voiceMode, onDictated);
  const [scenarios, setScenarios] = useState(customScenarios);
  const topic =
    topics.find((t) => t.id === topicId) ??
    scenarios.map((s) => ({ id: `custom:${s.id}`, label: s.title, prompt: s.description })).find((t) => t.id === topicId);

  const allCorrections = useMemo(
    () =>
      items
        .filter((i) => i.role === "user" && i.analysis?.status === "done")
        .flatMap((i) => i.analysis!.corrections.map((c, idx) => ({ ...c, key: `${i.id}-${idx}`, message: i.content })))
        .reverse(),
    [items],
  );
  const allWords = useMemo(() => {
    const seen = new Map<string, NewWord>();
    for (const i of items) for (const w of i.analysis?.newWords ?? []) seen.set(w.term.toLowerCase(), w);
    return [...seen.values()].reverse();
  }, [items]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [items]);

  // Close the session (level adjustment) when leaving the page.
  useEffect(() => {
    const end = () => {
      const id = sessionRef.current;
      if (id && scoresRef.current.length) {
        navigator.sendBeacon(`/api/tutor/${id}/end`, new Blob([JSON.stringify({ scores: scoresRef.current })], { type: "application/json" }));
        scoresRef.current = [];
      }
    };
    window.addEventListener("pagehide", end);
    return () => {
      window.removeEventListener("pagehide", end);
      end();
    };
  }, []);

  const patch = (id: string, update: Partial<ChatItem> | ((item: ChatItem) => Partial<ChatItem>)) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...(typeof update === "function" ? update(it) : update) } : it)));

  // Native-language row under every message (toggle remembered per browser).
  const [showTranslations, setShowTranslations] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem("tutor:translations") === "off") setShowTranslations(false);
    } catch {}
  }, []);
  const toggleTranslations = () =>
    setShowTranslations((on) => {
      try {
        localStorage.setItem("tutor:translations", on ? "off" : "on");
      } catch {}
      return !on;
    });

  // Translate finished messages that have a saved id, a few at a time.
  const translating = useRef(new Set<string>());
  useEffect(() => {
    if (!showTranslations || !sessionId || !providerReady) return;
    const queue = items.filter(
      (it) => !it.streaming && !it.failed && it.content && !it.id.startsWith("tmp-") && it.translation === undefined && !translating.current.has(it.id),
    );
    for (const it of queue.slice(0, 3)) {
      translating.current.add(it.id);
      void postJson<{ translation: string }>(`/api/tutor/${sessionId}/translate`, { messageId: it.id })
        .then(({ translation }) => patch(it.id, { translation }))
        .catch(() => patch(it.id, { translation: null }))
        .finally(() => translating.current.delete(it.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, showTranslations, sessionId, providerReady]);

  async function ensureSession(forTopic: string): Promise<string> {
    if (sessionRef.current) return sessionRef.current;
    const { id } = await postJson<{ id: string }>("/api/tutor/sessions", { topicId: forTopic, focus }, "POST", { retries: 0 });
    sessionRef.current = id;
    setSessionId(id);
    // Give the chat its own URL (like ChatGPT) without remounting mid-stream.
    window.history.replaceState(null, "", `/tutor/${id}`);
    return id;
  }

  /** Memory is learned by a background job; check back a few times for facts from this message. */
  async function pollMemory(messageId: string) {
    for (const delay of [3000, 5000, 8000]) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        const res = await fetch(`/api/memory?messageId=${encodeURIComponent(messageId)}`);
        if (!res.ok) return;
        const { facts } = (await res.json()) as { facts: string[] };
        if (facts.length) {
          patch(messageId, (it) => (it.analysis ? { analysis: { ...it.analysis, memorySaved: facts } } : {}));
          return;
        }
      } catch {
        return;
      }
    }
  }

  async function analyze(session: string, messageId: string) {
    try {
      const data = await postJson<Omit<Analysis, "status">>(`/api/tutor/${session}/analyze`, { messageId });
      if (typeof data.score === "number") scoresRef.current.push(data.score);
      patch(messageId, { analysis: { ...data, status: "done" } });
      void pollMemory(messageId);
    } catch {
      patch(messageId, (it) => ({ analysis: { corrections: [], newWords: [], ...(it.analysis ?? {}), status: "error" } }));
    }
  }

  /** Sends one message (or opens the chat when content is empty); resolves with the tutor's reply, or null on failure. */
  async function exchange(forTopic: string, content: string): Promise<{ id: string; reply: string } | null> {
    setError(null);
    setBusy(true);
    const userTemp = content ? nextTempId() : null;
    const assistantTemp = nextTempId();
    setItems((prev) => [
      ...prev,
      ...(userTemp ? [{ id: userTemp, role: "user" as const, content, analysis: { status: "pending" as const, corrections: [], newWords: [] } }] : []),
      { id: assistantTemp, role: "assistant", content: "", streaming: true },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const session = await ensureSession(forTopic);
      const res = await fetch(`/api/tutor/${session}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, topicId: forTopic, focus }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw await toError(res);

      const userMessageId = res.headers.get("X-User-Message-Id");
      if (userTemp && userMessageId) {
        patch(userTemp, { id: userMessageId });
        void analyze(session, userMessageId);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        const visible = text.split(" ")[0] ?? "";
        patch(assistantTemp, { content: visible });
      }
      const [reply = "", savedId] = text.split(" ");
      patch(assistantTemp, { content: reply, streaming: false, ...(savedId ? { id: savedId } : {}) });
      // In a voice call the call loop does the speaking.
      if (autoSpeak && reply && !callRef.current.active) void speaker.play(savedId ?? assistantTemp, reply);
      return reply ? { id: savedId ?? assistantTemp, reply } : null;
    } catch (err) {
      if (controller.signal.aborted) {
        patch(assistantTemp, (it) => ({ streaming: false, content: it.content || "(stopped)" }));
      } else {
        setItems((prev) => prev.filter((it) => it.id !== assistantTemp));
        if (userTemp) patch(userTemp, { failed: true, analysis: undefined });
        setError(err instanceof ClientApiError ? err : new ClientApiError("Couldn't reach the tutor."));
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
    return null;
  }

  function chooseTopic(id: string) {
    setTopicId(id);
    void exchange(id, "");
  }

  function send() {
    const content = input.trim();
    if (!content || busy || !topicId) return;
    if (dictation.state === "recording") dictation.stop();
    setInput("");
    void exchange(topicId, content);
  }

  // ---- Voice conversation ("call") mode: listen → send → speak → listen … ----
  const [call, setCall] = useState<{ state: "off" | "listening" | "thinking" | "speaking"; transcript: string; error: string | null }>({
    state: "off",
    transcript: "",
    error: null,
  });
  const callRef = useRef<{ active: boolean; listen: AbortController | null }>({ active: false, listen: null });

  function endCall(message: string | null = null) {
    callRef.current.active = false;
    callRef.current.listen?.abort();
    speaker.stop();
    setCall({ state: "off", transcript: "", error: message });
  }

  async function startCall() {
    const currentTopic = topicId;
    if (!currentTopic || callRef.current.active) return;
    callRef.current.active = true;
    speaker.stop();
    if (dictation.state === "recording") dictation.stop();
    let silentTurns = 0;
    setCall({ state: "listening", transcript: "", error: null });

    while (callRef.current.active) {
      const controller = new AbortController();
      callRef.current.listen = controller;
      setCall((c) => ({ ...c, state: "listening", transcript: "" }));
      let heard: string;
      try {
        heard = await listenTurn(voiceMode, { signal: controller.signal, onInterim: (text) => setCall((c) => ({ ...c, transcript: text })) });
      } catch (err) {
        if (callRef.current.active) endCall((err as Error).message);
        break;
      }
      if (!callRef.current.active) break;

      if (!heard.trim()) {
        silentTurns++;
        if (silentTurns >= 3) {
          endCall("Call ended — I didn't hear anything for a while.");
          break;
        }
        continue;
      }
      silentTurns = 0;

      setCall((c) => ({ ...c, state: "thinking", transcript: heard }));
      const result = await exchange(currentTopic, heard.trim());
      if (!callRef.current.active) break;
      if (!result) {
        endCall("Call ended — couldn't reach the tutor.");
        break;
      }
      setCall((c) => ({ ...c, state: "speaking" }));
      await speaker.play(result.id, result.reply);
    }
  }

  useEffect(
    () => () => {
      callRef.current.active = false;
      callRef.current.listen?.abort();
    },
    [],
  );

  const [adding, setAdding] = useState<Set<string>>(new Set());

  /** Adds a word to the dictionary with AI details; falls back to the basic definition if the AI call fails. */
  async function addWord(word: NewWord) {
    const key = word.term.toLowerCase();
    if (added.has(key) || adding.has(key)) return;
    setAdding((prev) => new Set(prev).add(key));
    try {
      try {
        await postJson("/api/vocab/smart", { text: word.term, context: word.example ?? word.definition });
      } catch {
        await postJson("/api/vocab", word);
      }
      setAdded((prev) => new Set(prev).add(key));
    } catch {
      // Leave the chip clickable so the learner can retry.
    } finally {
      setAdding((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  /** "Add to dictionary" under a tutor reply: AI picks the useful words and saves full entries. */
  async function saveWordsFrom(messageId: string, text: string) {
    patch(messageId, { saved: { status: "pending", words: [] } });
    try {
      const { words } = await postJson<{ words: { id: string; term: string; translation: string | null }[] }>("/api/vocab/extract", { text });
      setAdded((prev) => {
        const next = new Set(prev);
        for (const w of words) next.add(w.term.toLowerCase());
        return next;
      });
      patch(messageId, { saved: { status: "done", words } });
    } catch (err) {
      patch(messageId, { saved: { status: "error", words: [], message: (err as Error).message } });
    }
  }

  /** "Explain in Urdu" under a tutor reply (cached on the server; toggles open/closed once loaded). */
  async function explain(messageId: string) {
    const current = items.find((it) => it.id === messageId)?.explanation;
    if (current?.status === "done") {
      patch(messageId, { explanation: { ...current, open: !current.open } });
      return;
    }
    if (!sessionId || current?.status === "pending") return;
    patch(messageId, { explanation: { status: "pending", open: true } });
    try {
      const { explanation } = await postJson<{ explanation: ReplyExplanation }>(`/api/tutor/${sessionId}/explain`, { messageId });
      patch(messageId, { explanation: { status: "done", data: explanation, open: true } });
    } catch (err) {
      patch(messageId, { explanation: { status: "error", message: (err as Error).message, open: true } });
    }
  }

  function openCorrection(key: string) {
    setActiveCorrection(key);
    setPanel("corrections");
    setSheetOpen(true);
    requestAnimationFrame(() => document.getElementById(`corr-${key}`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }

  // Auto-open the conversation when arriving with a topic from Home.
  const opened = useRef(false);
  useEffect(() => {
    if (initialTopic && providerReady && !opened.current) {
      opened.current = true;
      void exchange(initialTopic, "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const correctionCount = allCorrections.length;
  const panelContent = (
    <CorrectionsPanel
      tab={panel}
      onTab={setPanel}
      corrections={allCorrections}
      words={allWords}
      added={added}
      activeKey={activeCorrection}
      onAddWord={addWord}
      onPlay={(id, text) => speaker.play(id, text)}
    />
  );

  return (
    <div className="flex h-dvh">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-2 md:px-4">
          <Link href="/" className="grid size-10 place-items-center rounded-full hover:bg-muted lg:hidden" aria-label="Back to home">
            <ChevronLeft className="size-5" />
          </Link>
          <span className="grid size-8 place-items-center rounded-full bg-primary font-display font-extrabold text-primary-foreground" aria-hidden>
            “
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">{chatTitle ?? topic?.label ?? "Tutor"}</p>
            <p className="truncate text-xs text-muted-foreground">{focus ? `Focus: ${humanizeCategory(focus)}` : "Ello · your tutor"}</p>
          </div>
          <LevelStamp level={level} />
          {difficulty !== "normal" ? (
            <Chip
              tone={difficulty === "stretch" ? "correct" : "highlight"}
              className="hidden sm:inline-flex"
              title={
                difficulty === "stretch"
                  ? "You're doing great — the tutor is using slightly harder English"
                  : "The tutor is using simpler English based on your recent messages"
              }
            >
              {difficulty === "stretch" ? "Challenge" : "Easier"}
            </Chip>
          ) : null}
          {topicId && providerReady ? (
            <button
              type="button"
              onClick={() => (call.state === "off" ? void startCall() : endCall())}
              className={cn(
                "grid size-10 place-items-center rounded-full hover:bg-muted",
                call.state === "off" ? "text-muted-foreground" : "bg-mistake-soft text-mistake",
              )}
              aria-label={call.state === "off" ? "Start voice conversation" : "End voice conversation"}
              title={call.state === "off" ? "Voice conversation (hands-free)" : "End voice conversation"}
            >
              {call.state === "off" ? <Phone className="size-5" /> : <PhoneOff className="size-5" />}
            </button>
          ) : null}
          <button
            type="button"
            onClick={toggleTranslations}
            className={cn("grid size-10 place-items-center rounded-full hover:bg-muted", showTranslations ? "text-primary" : "text-muted-foreground")}
            aria-pressed={showTranslations}
            aria-label={`${showTranslations ? "Hide" : "Show"} ${translationLang.name} translations`}
            title={`${showTranslations ? "Hide" : "Show"} ${translationLang.name} translations`}
          >
            <Languages className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setAutoSpeak((v) => !v)}
            className={cn("grid size-10 place-items-center rounded-full hover:bg-muted", autoSpeak ? "text-primary" : "text-muted-foreground")}
            aria-pressed={autoSpeak}
            aria-label={autoSpeak ? "Voice replies on" : "Voice replies off"}
            title={autoSpeak ? "Voice replies on" : "Voice replies off"}
          >
            <Volume2 className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="relative grid size-10 place-items-center rounded-full hover:bg-muted xl:hidden"
            aria-label={`Corrections (${correctionCount})`}
          >
            <PenLine className="size-5" />
            {correctionCount > 0 ? (
              <span className="absolute right-0.5 top-0.5 rounded-full bg-mistake px-1.5 font-mono text-[10px] text-white">{correctionCount}</span>
            ) : null}
          </button>
          {sessionId ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Server-render /tutor so the history list includes this chat.
                router.push("/tutor");
                router.refresh();
              }}
            >
              Chats
            </Button>
          ) : null}
        </header>

        <div ref={listRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
            {!providerReady ? (
              <Alert tone="streak" action={<Link href="/settings" className="font-semibold text-primary">Settings →</Link>}>
                {setupMessage}
              </Alert>
            ) : null}

            {!topicId ? (
              <>
                <ScenarioPicker
                  topics={topics}
                  scenarios={scenarios}
                  onScenariosChange={setScenarios}
                  onPick={chooseTopic}
                  disabled={!providerReady}
                />
                <ChatList chats={chats} activeId={sessionId} />
              </>
            ) : null}

            {items.map((item) =>
              item.role === "assistant" ? (
                <TutorMessage
                  key={item.id}
                  item={item}
                  lang={showTranslations ? translationLang : null}
                  onRetryTranslation={() => patch(item.id, { translation: undefined })}
                  playing={speaker.playingId === item.id}
                  loadingAudio={speaker.loadingId === item.id}
                  onPlay={() => (speaker.playingId === item.id ? speaker.stop() : speaker.play(item.id, item.content))}
                  onSaveWords={providerReady && !item.id.startsWith("tmp-") ? () => saveWordsFrom(item.id, item.content) : undefined}
                  onExplain={providerReady && !item.id.startsWith("tmp-") ? () => explain(item.id) : undefined}
                  explainLang={translationLang}
                />
              ) : (
                <UserMessage
                  key={item.id}
                  item={item}
                  lang={showTranslations ? translationLang : null}
                  onRetryTranslation={() => patch(item.id, { translation: undefined })}
                  added={added}
                  onOpenCorrection={openCorrection}
                  onAddWord={addWord}
                  adding={adding}
                  onAnalyze={
                    sessionId && !item.id.startsWith("tmp-") && providerReady
                      ? () => {
                          patch(item.id, { analysis: { status: "pending", corrections: [], newWords: [] } });
                          void analyze(sessionId, item.id);
                        }
                      : undefined
                  }
                  onRetry={() => {
                    setItems((prev) => prev.filter((it) => it.id !== item.id));
                    void exchange(topicId!, item.content);
                  }}
                />
              ),
            )}

            {error ? (
              <Alert
                action={
                  error.code === "provider_not_configured" ? (
                    <Link href="/settings" className="font-semibold text-primary">Settings →</Link>
                  ) : null
                }
              >
                {error.message}
              </Alert>
            ) : null}
          </div>
        </div>

        {topicId && call.state !== "off" ? (
          <CallBar state={call.state} transcript={call.transcript} onSkip={() => speaker.stop()} onEnd={() => endCall()} />
        ) : topicId ? (
          <div className="shrink-0 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
            <div className="mx-auto max-w-2xl">
              {dictation.error ? <p className="mb-2 text-sm text-mistake">{dictation.error}</p> : null}
              {call.error ? <p className="mb-2 text-sm text-mistake">{call.error}</p> : null}
              <form
                className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:border-primary"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <label htmlFor="composer" className="sr-only">
                  Your message
                </label>
                <textarea
                  id="composer"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder={dictation.state === "recording" ? "Listening… speak in English" : "Reply in English…"}
                  className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-[17px] outline-none placeholder:text-muted-foreground [field-sizing:content]"
                />
                {busy ? (
                  <button
                    type="button"
                    onClick={() => abortRef.current?.abort()}
                    className="grid size-11 place-items-center rounded-full bg-foreground text-background"
                    aria-label="Stop"
                  >
                    <Square className="size-4 fill-current" />
                  </button>
                ) : input.trim() && dictation.state !== "recording" ? (
                  <button type="submit" className="pressable grid size-11 place-items-center rounded-full bg-primary text-primary-foreground" aria-label="Send">
                    <SendHorizontal className="size-5" />
                  </button>
                ) : dictation.supported ? (
                  <button
                    type="button"
                    onClick={() => (dictation.state === "recording" ? dictation.stop() : dictation.start())}
                    disabled={dictation.state === "transcribing"}
                    className={cn(
                      "grid size-11 place-items-center rounded-full text-white",
                      dictation.state === "recording" ? "animate-pulse bg-mistake" : "pressable bg-primary text-primary-foreground",
                    )}
                    aria-label={dictation.state === "recording" ? "Stop recording" : "Speak"}
                  >
                    {dictation.state === "transcribing" ? (
                      <LoaderCircle className="size-5 animate-spin" />
                    ) : dictation.state === "recording" ? (
                      <Check className="size-5" />
                    ) : (
                      <Mic className="size-5" />
                    )}
                  </button>
                ) : (
                  <button type="submit" disabled className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground" aria-label="Send">
                    <SendHorizontal className="size-5" />
                  </button>
                )}
              </form>
            </div>
          </div>
        ) : null}
      </div>

      {/* Desktop corrections panel */}
      <aside className="hidden w-[360px] shrink-0 flex-col border-l border-border bg-card xl:flex">{panelContent}</aside>

      {/* Mobile / tablet sheet */}
      {sheetOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label="Corrections and new words">
          <button type="button" className="absolute inset-0 bg-black/30" aria-label="Close" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-3xl bg-card shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[380px] md:rounded-none">
            <div className="flex justify-end p-2">
              <button type="button" onClick={() => setSheetOpen(false)} className="grid size-10 place-items-center rounded-full hover:bg-muted" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            {panelContent}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CallBar({
  state,
  transcript,
  onSkip,
  onEnd,
}: {
  state: "listening" | "thinking" | "speaking";
  transcript: string;
  onSkip: () => void;
  onEnd: () => void;
}) {
  const label = { listening: "Listening… speak now", thinking: "Thinking…", speaking: "Tutor is speaking" }[state];
  return (
    <div className="shrink-0 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
      <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-primary/40 bg-primary-soft p-3" role="status" aria-live="polite">
        <span className={cn("relative grid size-12 shrink-0 place-items-center rounded-full text-white", state === "listening" ? "bg-mistake" : "bg-primary")}>
          {state === "listening" ? <span className="absolute inset-0 animate-ping rounded-full bg-mistake/40" aria-hidden /> : null}
          {state === "listening" ? (
            <Mic className="relative size-5" />
          ) : state === "thinking" ? (
            <LoaderCircle className="size-5 animate-spin" />
          ) : (
            <Volume2 className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{label}</p>
          <p className="truncate text-sm text-muted-foreground">{transcript || "Hands-free conversation · corrections still appear in the chat"}</p>
        </div>
        {state === "speaking" ? (
          <Button size="sm" variant="secondary" onClick={onSkip}>
            Skip
          </Button>
        ) : null}
        <Button size="sm" variant="danger" onClick={onEnd}>
          <PhoneOff className="size-4" /> End
        </Button>
      </div>
    </div>
  );
}

function TranslationRow({
  item,
  lang,
  align = "start",
  onRetry,
}: {
  item: ChatItem;
  lang: TranslationLanguage | null;
  align?: "start" | "end";
  onRetry: () => void;
}) {
  if (!lang || item.streaming || item.failed || !item.content) return null;
  if (item.translation === null) {
    return (
      <span className={cn("flex items-center gap-2 text-xs text-muted-foreground", align === "end" && "justify-end")}>
        {lang.name} translation failed
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 font-semibold text-primary">
          <RotateCcw className="size-3" /> Retry
        </button>
      </span>
    );
  }
  if (item.translation === undefined) {
    return (
      <span className={cn("flex items-center gap-1 text-xs text-muted-foreground", align === "end" && "justify-end")}>
        <LoaderCircle className="size-3 animate-spin" /> {lang.name}…
      </span>
    );
  }
  return (
    <p
      lang={lang.code}
      dir={lang.rtl ? "rtl" : "ltr"}
      className={cn(
        "max-w-[85%] text-muted-foreground",
        lang.code === "ur" ? "font-urdu text-[15px] leading-[2.1]" : "text-[15px] leading-relaxed",
        align === "end" ? "self-end text-right" : "text-start",
      )}
    >
      {item.translation}
    </p>
  );
}

function TutorMessage({
  item,
  lang,
  playing,
  loadingAudio,
  onPlay,
  onSaveWords,
  onRetryTranslation,
  onExplain,
  explainLang,
}: {
  item: ChatItem;
  onRetryTranslation: () => void;
  onExplain?: () => void;
  explainLang: TranslationLanguage;
  lang: TranslationLanguage | null;
  playing: boolean;
  loadingAudio: boolean;
  onPlay: () => void;
  onSaveWords?: () => void;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground" aria-hidden>
        “
      </span>
      <div className="min-w-0 flex-1">
        {item.streaming && !item.content ? (
          <div className="flex h-7 items-center gap-1" aria-label="Tutor is typing">
            <span className="typing-dot size-2 rounded-full bg-muted-foreground" />
            <span className="typing-dot size-2 rounded-full bg-muted-foreground" />
            <span className="typing-dot size-2 rounded-full bg-muted-foreground" />
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-[17px] leading-relaxed">
            {item.content}
            {item.streaming ? <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-primary align-middle" /> : null}
          </p>
        )}
        <div className="mt-1">
          <TranslationRow item={item} lang={lang} onRetry={onRetryTranslation} />
        </div>
        {!item.streaming && item.content ? (
          <div className="mt-1.5 flex gap-1">
            <button
              type="button"
              onClick={onPlay}
              className={cn("grid size-8 place-items-center rounded-full hover:bg-muted", playing ? "text-primary" : "text-muted-foreground")}
              aria-label={playing ? "Stop audio" : "Play audio"}
            >
              {loadingAudio ? <LoaderCircle className="size-4 animate-spin" /> : <Volume2 className="size-4" />}
            </button>
            {onSaveWords && item.saved?.status !== "done" ? (
              <button
                type="button"
                onClick={onSaveWords}
                disabled={item.saved?.status === "pending"}
                className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-70"
                title="Save useful words from this reply to your dictionary"
              >
                {item.saved?.status === "pending" ? <LoaderCircle className="size-3.5 animate-spin" /> : <BookMarked className="size-3.5" />}
                {item.saved?.status === "pending" ? "Adding…" : "Add to dictionary"}
              </button>
            ) : null}
            {onExplain ? (
              <button
                type="button"
                onClick={onExplain}
                disabled={item.explanation?.status === "pending"}
                aria-expanded={Boolean(item.explanation?.open)}
                className={cn(
                  "inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold hover:bg-muted hover:text-foreground disabled:opacity-70",
                  item.explanation?.open ? "text-primary" : "text-muted-foreground",
                )}
                title={`Explain this reply in ${explainLang.name}`}
              >
                {item.explanation?.status === "pending" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Lightbulb className="size-3.5" />}
                Explain in {explainLang.name}
              </button>
            ) : null}
          </div>
        ) : null}
        {item.saved?.status === "done" ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {item.saved.words.map((w) => (
              <Link key={w.id} href={`/dictionary?q=${encodeURIComponent(w.term)}`} title={w.translation ?? undefined}>
                <Chip tone="highlight">
                  <Check className="size-3" /> {w.term}
                </Chip>
              </Link>
            ))}
            <Link href="/dictionary" className="text-xs font-semibold text-primary">
              Open dictionary →
            </Link>
          </div>
        ) : null}
        {item.saved?.status === "error" ? (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-mistake">
            {item.saved.message}
            {onSaveWords ? (
              <button type="button" onClick={onSaveWords} className="inline-flex items-center gap-1 font-semibold text-primary">
                <RotateCcw className="size-3" /> Retry
              </button>
            ) : null}
          </p>
        ) : null}
        {item.explanation?.open ? (
          <div className="mt-2 rounded-xl border border-highlight bg-highlight-soft p-3">
            {item.explanation.status === "pending" ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" /> Explaining…
              </p>
            ) : item.explanation.status === "error" ? (
              <p className="flex flex-wrap items-center gap-2 text-sm text-mistake">
                {item.explanation.message}
                {onExplain ? (
                  <button type="button" onClick={onExplain} className="inline-flex items-center gap-1 font-semibold text-primary">
                    <RotateCcw className="size-3" /> Retry
                  </button>
                ) : null}
              </p>
            ) : item.explanation.data ? (
              <div className="flex flex-col gap-2">
                <p lang={explainLang.code} dir={explainLang.rtl ? "rtl" : "ltr"} className={cn("text-[15px]", explainLang.code === "ur" && "font-urdu leading-[2.1]")}>
                  {item.explanation.data.summary}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {item.explanation.data.points.map((p, i) => (
                    <li key={i} className="rounded-lg bg-card px-2.5 py-1.5">
                      <p className="text-sm font-semibold">{p.english}</p>
                      <p lang={explainLang.code} dir={explainLang.rtl ? "rtl" : "ltr"} className={cn("text-sm text-muted-foreground", explainLang.code === "ur" && "font-urdu leading-[2]")}>
                        {p.note}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function renderMarked(text: string, corrections: Correction[], messageId: string, onOpen: (key: string) => void) {
  const marks: { start: number; end: number; key: string; c: Correction }[] = [];
  corrections.forEach((c, idx) => {
    let from = 0;
    while (from <= text.length) {
      const start = text.indexOf(c.original, from);
      if (start === -1) return;
      const end = start + c.original.length;
      if (!marks.some((m) => start < m.end && end > m.start)) {
        marks.push({ start, end, key: `${messageId}-${idx}`, c });
        return;
      }
      from = start + 1;
    }
  });
  marks.sort((a, b) => a.start - b.start);
  const out: React.ReactNode[] = [];
  let cursor = 0;
  for (const m of marks) {
    if (m.start > cursor) out.push(text.slice(cursor, m.start));
    out.push(
      <button
        key={m.key}
        type="button"
        onClick={() => onOpen(m.key)}
        className="mistake-mark"
        title={`${m.c.original} → ${m.c.corrected}: ${m.c.explanation}`}
      >
        {text.slice(m.start, m.end)}
      </button>,
    );
    cursor = m.end;
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

function UserMessage({
  item,
  added,
  onOpenCorrection,
  onAddWord,
  onRetry,
  onAnalyze,
  lang,
  adding,
  onRetryTranslation,
}: {
  item: ChatItem;
  adding: Set<string>;
  onRetryTranslation: () => void;
  lang: TranslationLanguage | null;
  added: Set<string>;
  onOpenCorrection: (key: string) => void;
  onAddWord: (w: NewWord) => void;
  onRetry: () => void;
  /** Grades a message that has no feedback yet (e.g. from an older chat). */
  onAnalyze?: () => void;
}) {
  const a = item.analysis;
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary-soft px-4 py-2.5 text-[17px] leading-relaxed">
        {a?.status === "done" ? renderMarked(item.content, a.corrections, item.id, onOpenCorrection) : item.content}
      </div>
      <TranslationRow item={item} lang={lang} align="end" onRetry={onRetryTranslation} />
      {item.failed ? (
        <button type="button" onClick={onRetry} className="text-xs font-semibold text-mistake">
          Not sent · Retry
        </button>
      ) : a?.status === "pending" ? (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <LoaderCircle className="size-3 animate-spin" /> Checking…
        </span>
      ) : a?.status === "done" ? (
        <div className="flex max-w-[85%] flex-wrap justify-end gap-1.5">
          {a.corrections.length === 0 ? (
            <Chip tone="correct">
              <Check className="size-3" /> Perfect!
            </Chip>
          ) : (
            <button type="button" onClick={() => onOpenCorrection(`${item.id}-0`)}>
              <Chip tone="mistake">
                <PenLine className="size-3" /> {a.corrections.length} fix{a.corrections.length === 1 ? "" : "es"}
              </Chip>
            </button>
          )}
          {a.memorySaved?.length ? (
            <Link href="/settings" title={`Remembered: ${a.memorySaved.join(" · ")}`}>
              <Chip tone="primary">
                <Brain className="size-3" /> Remembered
              </Chip>
            </Link>
          ) : null}
          {a.newWords.map((w) => {
            const key = w.term.toLowerCase();
            const isAdded = added.has(key);
            const isAdding = adding.has(key);
            return isAdded ? (
              <Link key={w.term} href={`/dictionary?q=${encodeURIComponent(w.term)}`} title="In your dictionary">
                <Chip tone="highlight">
                  <Check className="size-3" /> {w.term}
                </Chip>
              </Link>
            ) : (
              <button
                key={w.term}
                type="button"
                onClick={() => onAddWord(w)}
                disabled={isAdding}
                title={`Add “${w.term}” to dictionary — ${w.definition}`}
              >
                <Chip tone="highlight">
                  {isAdding ? <LoaderCircle className="size-3 animate-spin" /> : <Plus className="size-3" />}
                  {w.term}
                </Chip>
              </button>
            );
          })}
        </div>
      ) : a?.status === "error" ? (
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          Feedback unavailable
          {onAnalyze ? (
            <button type="button" onClick={onAnalyze} className="font-semibold text-primary">
              Retry
            </button>
          ) : null}
        </span>
      ) : onAnalyze ? (
        <button type="button" onClick={onAnalyze}>
          <Chip tone="primary">
            <PenLine className="size-3" /> Get feedback
          </Chip>
        </button>
      ) : null}
    </div>
  );
}

function CorrectionsPanel({
  tab,
  onTab,
  corrections,
  words,
  added,
  activeKey,
  onAddWord,
  onPlay,
}: {
  tab: "corrections" | "words";
  onTab: (t: "corrections" | "words") => void;
  corrections: (Correction & { key: string; message: string })[];
  words: NewWord[];
  added: Set<string>;
  activeKey: string | null;
  onAddWord: (w: NewWord) => void;
  onPlay: (id: string, text: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-1 border-b border-border px-4" role="tablist">
        {(
          [
            ["corrections", `Corrections (${corrections.length})`],
            ["words", `New words (${words.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            type="button"
            onClick={() => onTab(id)}
            className={cn("-mb-px border-b-2 px-2 py-3 text-sm font-semibold", tab === id ? "border-primary text-foreground" : "border-transparent text-muted-foreground")}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "corrections" ? (
          corrections.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Your corrections will appear here as you chat.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {corrections.map((c) => (
                <li
                  key={c.key}
                  id={`corr-${c.key}`}
                  className={cn("rounded-xl border border-border p-3 transition-shadow", activeKey === c.key && "ring-2 ring-highlight")}
                >
                  <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                    {humanizeCategory(c.category)} · {c.type.toLowerCase()}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[15px]">
                    <span className="rounded bg-mistake-soft px-1.5 line-through decoration-mistake decoration-2">{c.original}</span>
                    <ArrowRight className="size-4 text-muted-foreground" aria-label="corrected to" />
                    <span className="rounded bg-correct-soft px-1.5 font-semibold">{c.corrected}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{c.explanation}</p>
                  <button
                    type="button"
                    onClick={() => onPlay(`corr-${c.key}`, c.message.replace(c.original, c.corrected))}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary"
                  >
                    <Volume2 className="size-3.5" /> Hear it corrected
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : words.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Useful new words from the chat will collect here.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {words.map((w) => {
              const isAdded = added.has(w.term.toLowerCase());
              return (
                <li key={w.term} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="highlighter font-display text-lg font-bold">{w.term}</p>
                    <Button size="sm" variant={isAdded ? "ghost" : "soft"} onClick={() => onAddWord(w)} disabled={isAdded}>
                      {isAdded ? <Check className="size-4" /> : <Sparkles className="size-4" />}
                      {isAdded ? "In dictionary" : "Add to dictionary"}
                    </Button>
                  </div>
                  <p className="mt-1 text-sm">{w.definition}</p>
                  {w.example ? <p className="mt-1 text-sm italic text-muted-foreground">“{w.example}”</p> : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
