import type { AIRole, SettingsOverrides } from "@repo/config";
import { decryptSecret, encryptSecret, maskSecret } from "@repo/config/secrets";
import { db } from "./client";

export interface AiSettingsView {
  anthropic: { hasKey: boolean; hint: string | null };
  openai: { hasKey: boolean; hint: string | null; baseUrl: string | null };
  routes: Record<AIRole, string | null>;
  voiceProvider: "openai" | "browser" | null;
  /** A key is stored but can't be decrypted (APP_SECRET changed or missing). */
  unreadableKeys: boolean;
}

/** undefined = keep, null = clear, string = set. */
export interface AiSettingsUpdate {
  anthropicApiKey?: string | null;
  openaiApiKey?: string | null;
  openaiBaseUrl?: string | null;
  routes?: Partial<Record<AIRole, string | null>>;
  voiceProvider?: "openai" | "browser" | null;
}

const voice = (v: string | null | undefined) => (v === "openai" || v === "browser" ? v : null);

function reveal(value: string | null, secret: string | undefined): { plain: string | null; unreadable: boolean } {
  if (!value) return { plain: null, unreadable: false };
  const plain = secret ? decryptSecret(value, secret) : null;
  return { plain, unreadable: plain === null };
}

export async function loadAiOverrides(userId: string, secret: string | undefined): Promise<SettingsOverrides> {
  const row = await db().aiSettings.findUnique({ where: { userId } });
  if (!row) return {};
  return {
    anthropicApiKey: reveal(row.anthropicApiKey, secret).plain,
    openaiApiKey: reveal(row.openaiApiKey, secret).plain,
    openaiBaseUrl: row.openaiBaseUrl,
    routes: { tutor: row.tutorModel, grader: row.graderModel, generator: row.generatorModel },
    voiceProvider: voice(row.voiceProvider),
  };
}

export async function getAiSettingsView(userId: string, secret: string | undefined): Promise<AiSettingsView> {
  const row = await db().aiSettings.findUnique({ where: { userId } });
  const anthropic = reveal(row?.anthropicApiKey ?? null, secret);
  const openai = reveal(row?.openaiApiKey ?? null, secret);
  return {
    anthropic: { hasKey: Boolean(row?.anthropicApiKey), hint: anthropic.plain ? maskSecret(anthropic.plain) : null },
    openai: { hasKey: Boolean(row?.openaiApiKey), hint: openai.plain ? maskSecret(openai.plain) : null, baseUrl: row?.openaiBaseUrl ?? null },
    routes: { tutor: row?.tutorModel ?? null, grader: row?.graderModel ?? null, generator: row?.generatorModel ?? null },
    voiceProvider: voice(row?.voiceProvider),
    unreadableKeys: anthropic.unreadable || openai.unreadable,
  };
}

export async function saveAiSettings(userId: string, update: AiSettingsUpdate, secret: string | undefined) {
  const encryptKey = (v: string | null | undefined) => {
    if (v === undefined) return undefined;
    if (v === null || v.trim() === "") return null;
    if (!secret) throw new Error("APP_SECRET is not set, so API keys can't be stored securely.");
    return encryptSecret(v.trim(), secret);
  };
  const data = {
    anthropicApiKey: encryptKey(update.anthropicApiKey),
    openaiApiKey: encryptKey(update.openaiApiKey),
    openaiBaseUrl: update.openaiBaseUrl === undefined ? undefined : update.openaiBaseUrl?.trim() || null,
    tutorModel: update.routes && "tutor" in update.routes ? update.routes.tutor || null : undefined,
    graderModel: update.routes && "grader" in update.routes ? update.routes.grader || null : undefined,
    generatorModel: update.routes && "generator" in update.routes ? update.routes.generator || null : undefined,
    voiceProvider: update.voiceProvider === undefined ? undefined : update.voiceProvider,
  };
  const defined = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
  await db().aiSettings.upsert({
    where: { userId },
    update: defined,
    create: { userId, ...defined },
  });
}
