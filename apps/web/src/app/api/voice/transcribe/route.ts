import { getCurrentUser } from "@/lib/current-user";
import { transcribe, voiceMode } from "@repo/voice/server";
import { NextResponse } from "next/server";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse, HttpError } from "@/lib/api";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const env = await aiEnvFor(user.id);
    if (voiceMode(env) !== "openai") throw new HttpError(400, "Server transcription is not enabled.", "voice_disabled");
    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File)) throw new HttpError(400, "Missing audio file.");
    if (audio.size > MAX_BYTES) throw new HttpError(413, "Recording is too long.");
    const text = await transcribe(new File([audio], "speech.webm", { type: audio.type || "audio/webm" }), env);
    return NextResponse.json({ text });
  } catch (err) {
    return errorResponse(err);
  }
}
