/** Browser-side voice helpers: Web Speech API fallback + MediaRecorder capture for server STT. */

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort?(): void;
}

type RecognitionCtor = new () => SpeechRecognitionLike;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canRecognizeInBrowser(): boolean {
  return recognitionCtor() !== null;
}

export function canRecordAudio(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
}

export interface ListenHandle {
  stop(): void;
}

function transcriptOf(event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) {
  let text = "";
  let final = true;
  for (let i = 0; i < event.results.length; i++) {
    const r = event.results[i]!;
    text += r[0]?.transcript ?? "";
    if (!r.isFinal) final = false;
  }
  return { text: text.trim(), final };
}

/** Live dictation via Web Speech. `onText` receives the full transcript so far. */
export function listenInBrowser(opts: {
  onText: (text: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
}): ListenHandle {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    opts.onError?.("Speech recognition is not supported in this browser.");
    opts.onEnd?.();
    return { stop() {} };
  }
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = true;
  rec.onresult = (event) => {
    const { text, final } = transcriptOf(event);
    opts.onText(text, final);
  };
  rec.onerror = (e) => opts.onError?.(e.error === "not-allowed" ? "Microphone permission was denied." : e.error);
  rec.onend = () => opts.onEnd?.();
  rec.start();
  return { stop: () => rec.stop() };
}

/**
 * One conversational turn with Web Speech: resolves with what was said once the speaker pauses.
 * Resolves "" when nothing was heard (or when aborted); rejects only when the mic is blocked.
 */
export function listenOnce(opts: { signal?: AbortSignal; onInterim?: (text: string) => void; pauseMs?: number; noSpeechMs?: number } = {}): Promise<string> {
  const Ctor = recognitionCtor();
  if (!Ctor) return Promise.reject(new Error("Speech recognition isn't supported in this browser. Use Chrome or Edge, or switch the voice engine to OpenAI in Settings."));

  return new Promise((resolve, reject) => {
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    let transcript = "";
    let settled = false;
    let pauseTimer: ReturnType<typeof setTimeout> | undefined;
    const noSpeechTimer = setTimeout(() => rec.stop(), opts.noSpeechMs ?? 8000);

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(pauseTimer);
      clearTimeout(noSpeechTimer);
      fn();
    };

    rec.onresult = (event) => {
      clearTimeout(noSpeechTimer);
      transcript = transcriptOf(event).text;
      opts.onInterim?.(transcript);
      clearTimeout(pauseTimer);
      pauseTimer = setTimeout(() => rec.stop(), opts.pauseMs ?? 1300);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        settle(() => reject(new Error("Microphone permission was denied.")));
      }
    };
    rec.onend = () => settle(() => resolve(transcript));
    opts.signal?.addEventListener(
      "abort",
      () => {
        settle(() => resolve(""));
        (rec.abort ?? rec.stop).call(rec);
      },
      { once: true },
    );
    rec.start();
  });
}

/** Records microphone audio; resolves with a webm Blob when stopped. */
export async function recordAudio(): Promise<{ stop(): Promise<Blob> }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.start();
  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
        };
        recorder.stop();
      }),
  };
}

/**
 * Records one spoken turn: starts on voice, stops after a pause. Resolves null if nobody spoke
 * (or when aborted). Uses a simple volume threshold — good enough for a quiet room.
 */
export async function recordUntilSilence(
  opts: { signal?: AbortSignal; pauseMs?: number; noSpeechMs?: number; maxMs?: number; threshold?: number; onLevel?: (level: number) => void } = {},
): Promise<Blob | null> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    throw new Error("Microphone permission was denied.");
  }
  const audioCtx = new AudioContext();
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;
  audioCtx.createMediaStreamSource(stream).connect(analyser);
  const samples = new Uint8Array(analyser.fftSize);
  const recorder = new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.start(250);

  return new Promise((resolve) => {
    const started = performance.now();
    let lastVoice = started;
    let spoke = false;
    let frame = 0;
    let finished = false;

    const finish = (keep: boolean) => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      const cleanup = () => {
        stream.getTracks().forEach((t) => t.stop());
        void audioCtx.close();
        resolve(keep && spoke ? new Blob(chunks, { type: recorder.mimeType || "audio/webm" }) : null);
      };
      if (recorder.state === "inactive") cleanup();
      else {
        recorder.onstop = cleanup;
        recorder.stop();
      }
    };

    const tick = () => {
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const v of samples) {
        const x = (v - 128) / 128;
        sum += x * x;
      }
      const level = Math.sqrt(sum / samples.length);
      opts.onLevel?.(level);
      const now = performance.now();
      if (level > (opts.threshold ?? 0.035)) {
        spoke = true;
        lastVoice = now;
      }
      if (spoke && now - lastVoice > (opts.pauseMs ?? 1400)) return finish(true);
      if (!spoke && now - started > (opts.noSpeechMs ?? 8000)) return finish(false);
      if (now - started > (opts.maxMs ?? 45000)) return finish(true);
      frame = requestAnimationFrame(tick);
    };

    opts.signal?.addEventListener("abort", () => finish(false), { once: true });
    frame = requestAnimationFrame(tick);
  });
}

/** Speaks text with the browser voice; resolves when speech finishes (or is cancelled). */
export function speakInBrowser(text: string, { rate = 0.95 } = {}): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve();
  window.speechSynthesis.cancel();
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = rate;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
