import { listModels } from "@repo/ai";
import { PROVIDERS } from "@repo/config";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse, parseBody } from "@/lib/api";

const bodySchema = z.object({
  provider: z.enum(PROVIDERS),
  /** Unsaved key typed in the form; falls back to the saved/.env key. */
  apiKey: z.string().max(400).optional(),
  baseUrl: z.string().max(400).nullable().optional(),
});

/** Tests a provider credential by listing its models. */
export async function POST(req: Request) {
  try {
    const body = await parseBody(req, bodySchema);
    const user = await getCurrentUser();
    const env = await aiEnvFor(user.id);
    const apiKey = body.apiKey?.trim() || (body.provider === "anthropic" ? env.ANTHROPIC_API_KEY : env.OPENAI_API_KEY);
    const baseUrl = body.provider === "openai" ? (body.baseUrl === undefined ? env.OPENAI_BASE_URL : body.baseUrl?.trim() || null) : null;

    const started = Date.now();
    try {
      const models = await listModels(body.provider, { apiKey, baseUrl });
      return NextResponse.json({ ok: true, ms: Date.now() - started, models });
    } catch (err) {
      const status = (err as { status?: number }).status;
      const message =
        status === 401 || status === 403
          ? "Key rejected by the provider."
          : status === 404
            ? "The endpoint doesn't expose a models list. Check the base URL."
            : (err as Error).message || "Connection failed.";
      return NextResponse.json({ ok: false, error: status ? `${status} — ${message}` : message }, { status: 200 });
    }
  } catch (err) {
    return errorResponse(err);
  }
}
