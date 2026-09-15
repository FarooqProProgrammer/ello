import { describe, expect, it } from "vitest";
import { applyOverrides, configuredProviders, fillMissingRoutes, loadEnv, parseModelRoute, routeForRole } from "./index";

describe("fillMissingRoutes", () => {
  it("lets unconfigured roles borrow the tutor's working route", () => {
    const env = loadEnv({ OPENAI_API_KEY: "k", AI_TUTOR: "openai:auto/best-free" });
    const filled = fillMissingRoutes(env);
    expect(routeForRole(filled, "grader")).toEqual({ provider: "openai", model: "auto/best-free" });
    expect(routeForRole(filled, "generator")).toEqual({ provider: "openai", model: "auto/best-free" });
  });

  it("keeps configured routes and leaves everything alone when nothing is configured", () => {
    const env = loadEnv({ ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o", AI_TUTOR: "openai:gpt-x" });
    expect(routeForRole(fillMissingRoutes(env), "grader")).toEqual({ provider: "anthropic", model: "claude-haiku-4-5" });
    const bare = loadEnv({});
    expect(fillMissingRoutes(bare)).toEqual(bare);
  });
});

describe("applyOverrides", () => {
  it("prefers saved values and falls back to env", () => {
    const env = loadEnv({ ANTHROPIC_API_KEY: "env-key", AI_GRADER: "anthropic:claude-haiku-4-5" });
    const merged = applyOverrides(env, {
      openaiApiKey: "saved-openai",
      openaiBaseUrl: "http://localhost:11434/v1",
      routes: { tutor: "openai:llama3.1:8b", grader: "bogus", generator: null },
      voiceProvider: "openai",
    });
    expect(merged.ANTHROPIC_API_KEY).toBe("env-key");
    expect(merged.OPENAI_API_KEY).toBe("saved-openai");
    expect(routeForRole(merged, "tutor")).toEqual({ provider: "openai", model: "llama3.1:8b" });
    expect(routeForRole(merged, "grader")).toEqual({ provider: "anthropic", model: "claude-haiku-4-5" });
    expect(merged.VOICE_PROVIDER).toBe("openai");
  });
});

describe("parseModelRoute", () => {
  it("splits provider and model on the first colon", () => {
    expect(parseModelRoute("openai:llama3.1:8b")).toEqual({ provider: "openai", model: "llama3.1:8b" });
  });

  it("rejects unknown providers and malformed values", () => {
    expect(() => parseModelRoute("gemini:pro")).toThrow(/Unknown AI provider/);
    expect(() => parseModelRoute("anthropic")).toThrow(/Invalid model route/);
    expect(() => parseModelRoute("anthropic:")).toThrow(/Invalid model route/);
  });
});

describe("loadEnv", () => {
  it("applies defaults and treats empty strings as unset", () => {
    const env = loadEnv({ OPENAI_API_KEY: "", AI_TUTOR: "" });
    expect(routeForRole(env, "tutor")).toEqual({ provider: "anthropic", model: "claude-opus-5" });
    expect(env.VOICE_PROVIDER).toBe("browser");
    expect(configuredProviders(env)).toEqual({ anthropic: false, openai: false });
  });

  it("reads role routes from env", () => {
    const env = loadEnv({ AI_GRADER: "openai:gpt-5-mini", OPENAI_API_KEY: "sk-test" });
    expect(routeForRole(env, "grader")).toEqual({ provider: "openai", model: "gpt-5-mini" });
    expect(configuredProviders(env).openai).toBe(true);
  });

  it("throws a readable error for invalid routes", () => {
    expect(() => loadEnv({ AI_TUTOR: "nope:model" })).toThrow(/AI_TUTOR/);
  });
});
