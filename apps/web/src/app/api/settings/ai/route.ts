import { AI_ROLES, loadEnv, parseModelRoute } from "@repo/config";
import { getAiSettingsView, saveAiSettings } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, HttpError, parseBody } from "@/lib/api";

const keyField = z.string().max(400).nullable().optional();
const routeField = z
  .string()
  .max(200)
  .nullable()
  .refine((v) => {
    if (!v) return true;
    try {
      parseModelRoute(v);
      return true;
    } catch {
      return false;
    }
  }, "Model must look like provider:model");

const bodySchema = z.object({
  anthropicApiKey: keyField,
  openaiApiKey: keyField,
  openaiBaseUrl: z.union([z.url("Base URL must be a valid URL"), z.literal("")]).nullable().optional(),
  routes: z.object(Object.fromEntries(AI_ROLES.map((r) => [r, routeField.optional()]))).optional(),
  voiceProvider: z.enum(["openai", "browser"]).nullable().optional(),
});

export async function PUT(req: Request) {
  try {
    const body = await parseBody(req, bodySchema);
    const env = loadEnv();
    const settingKey = Boolean(body.anthropicApiKey?.trim() || body.openaiApiKey?.trim());
    if (settingKey && !env.APP_SECRET) {
      throw new HttpError(400, "Add APP_SECRET to .env before saving API keys (they are stored encrypted).", "no_secret");
    }
    const user = await getCurrentUser();
    await saveAiSettings(user.id, body, env.APP_SECRET);
    return NextResponse.json(await getAiSettingsView(user.id, env.APP_SECRET));
  } catch (err) {
    return errorResponse(err);
  }
}
