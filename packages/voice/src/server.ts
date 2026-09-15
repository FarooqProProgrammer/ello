import OpenAI from "openai";
import { loadEnv, type Env } from "@repo/config";

export type VoiceMode = "openai" | "browser";

/** "openai" only when requested AND a key exists; otherwise the client uses Web Speech. */
export function voiceMode(env: Env = loadEnv()): VoiceMode {
  return env.VOICE_PROVIDER === "openai" && env.OPENAI_API_KEY ? "openai" : "browser";
}

function client(env: Env): OpenAI {
  if (!env.OPENAI_API_KEY) throw new Error("Server voice requires OPENAI_API_KEY.");
  // Speech endpoints are OpenAI-only; ignore OPENAI_BASE_URL which may point at a chat-only server.
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

export async function transcribe(audio: File, env: Env = loadEnv()): Promise<string> {
  const result = await client(env).audio.transcriptions.create({
    file: audio,
    model: "gpt-4o-transcribe",
    language: "en",
  });
  return result.text;
}

export async function synthesize(text: string, env: Env = loadEnv()): Promise<ArrayBuffer> {
  const response = await client(env).audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: text.slice(0, 4000),
    response_format: "mp3",
    instructions: "Speak clearly at a slightly slower pace, like a friendly English teacher.",
  });
  return response.arrayBuffer();
}
