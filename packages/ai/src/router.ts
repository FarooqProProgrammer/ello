import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { configuredProviders, loadEnv, routeForRole, type AIRole, type Env, type ProviderName } from "@repo/config";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { ProviderNotConfiguredError, type AIProvider } from "./types";

const cache = new Map<string, AIProvider>();

/** Returns the provider configured for a role. Activities never pick models directly. */
export function getProvider(role: AIRole, env: Env = loadEnv()): AIProvider {
  const route = routeForRole(env, role);
  // Keys and base URL are part of the cache key so changing them in Settings takes effect immediately.
  const credential = route.provider === "anthropic" ? env.ANTHROPIC_API_KEY : `${env.OPENAI_API_KEY}|${env.OPENAI_BASE_URL}`;
  const key = `${route.provider}:${route.model}:${fingerprint(credential ?? "")}`;
  const cached = cache.get(key);
  if (cached) return cached;

  if (!configuredProviders(env)[route.provider]) {
    throw new ProviderNotConfiguredError(route.provider);
  }

  const provider =
    route.provider === "anthropic"
      ? new AnthropicProvider(route.model, new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }))
      : new OpenAIProvider(
          route.model,
          new OpenAI({
            // Local OpenAI-compatible servers often accept any key.
            apiKey: env.OPENAI_API_KEY ?? "not-needed",
            ...(env.OPENAI_BASE_URL ? { baseURL: env.OPENAI_BASE_URL } : {}),
          }),
        );
  cache.set(key, provider);
  return provider;
}

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

/** Lists model IDs available to a credential; doubles as a connection test. */
export async function listModels(
  provider: ProviderName,
  { apiKey, baseUrl }: { apiKey?: string | null; baseUrl?: string | null },
): Promise<string[]> {
  const ids: string[] = [];
  if (provider === "anthropic") {
    if (!apiKey) throw new ProviderNotConfiguredError("anthropic");
    const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 15_000 });
    for await (const model of client.models.list({ limit: 100 })) ids.push(model.id);
    return ids;
  }
  if (!apiKey && !baseUrl) throw new ProviderNotConfiguredError("openai");
  const client = new OpenAI({ apiKey: apiKey || "not-needed", ...(baseUrl ? { baseURL: baseUrl } : {}), maxRetries: 0, timeout: 15_000 });
  for await (const model of client.models.list()) ids.push(model.id);
  return ids.sort();
}

export interface RoleStatus {
  role: AIRole;
  provider: string;
  model: string;
  configured: boolean;
}

export function describeRoles(env: Env = loadEnv()): RoleStatus[] {
  const configured = configuredProviders(env);
  return (["tutor", "grader", "generator"] as const).map((role) => {
    const route = routeForRole(env, role);
    return { role, provider: route.provider, model: route.model, configured: configured[route.provider] };
  });
}
