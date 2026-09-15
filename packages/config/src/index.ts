import { z } from "zod";

export const PROVIDERS = ["anthropic", "openai"] as const;
export type ProviderName = (typeof PROVIDERS)[number];

export const AI_ROLES = ["tutor", "grader", "generator"] as const;
export type AIRole = (typeof AI_ROLES)[number];

export interface ModelRoute {
  provider: ProviderName;
  model: string;
}

/** Parses "provider:model", e.g. "anthropic:claude-opus-5". Model names may contain colons. */
export function parseModelRoute(value: string): ModelRoute {
  const idx = value.indexOf(":");
  if (idx <= 0 || idx === value.length - 1) {
    throw new Error(`Invalid model route "${value}". Expected "provider:model".`);
  }
  const provider = value.slice(0, idx);
  const model = value.slice(idx + 1);
  if (!(PROVIDERS as readonly string[]).includes(provider)) {
    throw new Error(`Unknown AI provider "${provider}". Use one of: ${PROVIDERS.join(", ")}.`);
  }
  return { provider: provider as ProviderName, model };
}

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

const modelRoute = (fallback: string) =>
  z.preprocess(emptyToUndefined, z.string().default(fallback)).transform((v, ctx) => {
    try {
      return parseModelRoute(v);
    } catch (err) {
      ctx.addIssue({ code: "custom", message: (err as Error).message });
      return z.NEVER;
    }
  });

const envSchema = z.object({
  DATABASE_URL: z.preprocess(emptyToUndefined, z.string().optional()),
  /** Encrypts API keys saved from the Settings page. */
  APP_SECRET: z.preprocess(emptyToUndefined, z.string().min(16).optional()),
  ANTHROPIC_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  OPENAI_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  OPENAI_BASE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  AI_TUTOR: modelRoute("anthropic:claude-opus-5"),
  AI_GRADER: modelRoute("anthropic:claude-haiku-4-5"),
  AI_GENERATOR: modelRoute("anthropic:claude-opus-5"),
  VOICE_PROVIDER: z.preprocess(emptyToUndefined, z.enum(["openai", "browser"]).default("browser")),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return result.data;
}

export function routeForRole(env: Env, role: AIRole): ModelRoute {
  switch (role) {
    case "tutor":
      return env.AI_TUTOR;
    case "grader":
      return env.AI_GRADER;
    case "generator":
      return env.AI_GENERATOR;
  }
}

/** Values saved in the app (Settings page). null/undefined = use the .env value. */
export interface SettingsOverrides {
  anthropicApiKey?: string | null;
  openaiApiKey?: string | null;
  openaiBaseUrl?: string | null;
  routes?: Partial<Record<AIRole, string | null>>;
  voiceProvider?: "openai" | "browser" | null;
}

/** Layers app-saved settings over .env. Invalid saved routes are ignored. */
export function applyOverrides(env: Env, o: SettingsOverrides): Env {
  const route = (role: AIRole, fallback: ModelRoute) => {
    const saved = o.routes?.[role];
    if (!saved) return fallback;
    try {
      return parseModelRoute(saved);
    } catch {
      return fallback;
    }
  };
  return {
    ...env,
    ANTHROPIC_API_KEY: o.anthropicApiKey || env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: o.openaiApiKey || env.OPENAI_API_KEY,
    OPENAI_BASE_URL: o.openaiBaseUrl || env.OPENAI_BASE_URL,
    AI_TUTOR: route("tutor", env.AI_TUTOR),
    AI_GRADER: route("grader", env.AI_GRADER),
    AI_GENERATOR: route("generator", env.AI_GENERATOR),
    VOICE_PROVIDER: o.voiceProvider ?? env.VOICE_PROVIDER,
  };
}

/**
 * Roles whose provider has no credentials borrow the route of a role that does
 * (tutor first), so configuring one provider is enough to use the whole app.
 */
export function fillMissingRoutes(env: Env): Env {
  const configured = configuredProviders(env);
  const donor = AI_ROLES.map((r) => routeForRole(env, r)).find((route) => configured[route.provider]);
  if (!donor) return env;
  const pick = (route: ModelRoute) => (configured[route.provider] ? route : donor);
  return { ...env, AI_TUTOR: pick(env.AI_TUTOR), AI_GRADER: pick(env.AI_GRADER), AI_GENERATOR: pick(env.AI_GENERATOR) };
}

export function formatModelRoute(route: ModelRoute): string {
  return `${route.provider}:${route.model}`;
}

/** Which providers have credentials configured. OpenAI counts as configured with a base URL alone (e.g. local Ollama). */
export function configuredProviders(env: Env): Record<ProviderName, boolean> {
  return {
    anthropic: Boolean(env.ANTHROPIC_API_KEY),
    openai: Boolean(env.OPENAI_API_KEY || env.OPENAI_BASE_URL),
  };
}
