"use client";

import {
  canRecognizeInBrowser,
  canRecordAudio,
  listenInBrowser,
  listenOnce,
  recordAudio,
  recordUntilSilence,
  speakInBrowser,
  stopSpeaking,
} from "@repo/voice/browser";
import { useCallback, useEffect, useRef, useState } from "react";
import { toError } from "@/lib/client";

export type VoiceMode = "openai" | "browser";

/** Mic capture that fills text for review before sending (never auto-sends). */
export function useDictation(mode: VoiceMode, onText: (text: string) => void) {
  const [state, setState] = useState<"idle" | "recording" | "transcribing">("idle");
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(mode === "openai" ? canRecordAudio() : canRecognizeInBrowser());
  }, [mode]);

  const start = useCallback(async () => {
    setError(null);
    if (mode === "browser") {
      const handle = listenInBrowser({
        onText: (text) => onText(text),
        onError: (message) => setError(message),
        onEnd: () => setState("idle"),
      });
      stopRef.current = () => handle.stop();
      setState("recording");
      return;
    }
    try {
      const recorder = await recordAudio();
      setState("recording");
      stopRef.current = async () => {
        setState("transcribing");
        try {
          const blob = await recorder.stop();
          onText(await transcribeBlob(blob));
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setState("idle");
        }
      };
    } catch {
      setError("Microphone permission was denied.");
      setState("idle");
    }
  }, [mode, onText]);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    if (mode === "browser") setState("idle");
  }, [mode]);

  return { state, error, supported, start, stop };
}

async function transcribeBlob(blob: Blob, signal?: AbortSignal): Promise<string> {
  const form = new FormData();
  form.append("audio", blob, "speech.webm");
  const res = await fetch("/api/voice/transcribe", { method: "POST", body: form, signal });
  if (!res.ok) throw await toError(res);
  return ((await res.json()) as { text: string }).text;
}

/**
 * Listens for one spoken turn in a voice conversation and returns the transcript ("" if silent).
 * Browser mode uses Web Speech; OpenAI mode records until a pause and transcribes on the server.
 */
export async function listenTurn(
  mode: VoiceMode,
  opts: { signal?: AbortSignal; onInterim?: (text: string) => void; pauseMs?: number; noSpeechMs?: number } = {},
): Promise<string> {
  if (mode === "browser") return listenOnce({ signal: opts.signal, onInterim: opts.onInterim, pauseMs: opts.pauseMs, noSpeechMs: opts.noSpeechMs });
  if (!canRecordAudio()) throw new Error("This browser can't record audio.");
  const blob = await recordUntilSilence({ signal: opts.signal, pauseMs: opts.pauseMs, noSpeechMs: opts.noSpeechMs });
  if (!blob || opts.signal?.aborted) return "";
  opts.onInterim?.("Transcribing…");
  return transcribeBlob(blob, opts.signal);
}

/** Plays tutor text aloud via server TTS or the browser voice. `play` resolves when playback ends or is stopped. */
export function useSpeaker(mode: VoiceMode) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resolveRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    stopSpeaking();
    setPlayingId(null);
    resolveRef.current?.();
    resolveRef.current = null;
  }, []);

  const play = useCallback(
    async (id: string, text: string, { rate }: { rate?: number } = {}): Promise<void> => {
      stop();
      const finished = new Promise<void>((resolve) => {
        resolveRef.current = resolve;
      });
      const done = () => {
        resolveRef.current?.();
        resolveRef.current = null;
        setPlayingId((current) => (current === id ? null : current));
      };

      if (mode === "browser") {
        setPlayingId(id);
        void speakInBrowser(text, { rate: rate ?? 0.95 }).then(done);
        return finished;
      }

      setLoadingId(id);
      try {
        const res = await fetch("/api/voice/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw await toError(res);
        const url = URL.createObjectURL(await res.blob());
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.playbackRate = rate ?? 1;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          done();
        };
        audio.onerror = done;
        setPlayingId(id);
        await audio.play();
      } catch {
        setPlayingId(id);
        void speakInBrowser(text).then(done); // graceful fallback
      } finally {
        setLoadingId(null);
      }
      return finished;
    },
    [mode, stop],
  );

  useEffect(() => stop, [stop]);
  return { play, stop, playingId, loadingId };
}
