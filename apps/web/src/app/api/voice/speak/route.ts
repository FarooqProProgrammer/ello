import { getCurrentUser } from "@/lib/current-user";
import { synthesize, voiceMode } from "@repo/voice/server";
import { z } from "zod";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse, HttpError, parseBody } from "@/lib/api";

const bodySchema = z.object({ text: z.string().min(1).max(4000) });

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const env = await aiEnvFor(user.id);
    if (voiceMode(env) !== "openai") throw new HttpError(400, "Server speech is not enabled.", "voice_disabled");
    const { text } = await parseBody(req, bodySchema);
    const audio = await synthesize(text, env);
    return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}
