import type { ZodType } from "zod";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  system?: string;
  messages: ChatMessage[];
  maxTokens?: number;
}

export interface ChatResponse {
  text: string;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  chat(req: ChatRequest): Promise<ChatResponse>;
  /** Yields text deltas as they arrive. */
  stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<string>;
  /** Returns output validated against the schema; retries once on invalid output. */
  structured<T>(req: ChatRequest, schema: ZodType<T>, schemaName: string): Promise<T>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(public readonly provider: string) {
    super(
      provider === "anthropic"
        ? "Anthropic is not configured. Set ANTHROPIC_API_KEY."
        : "OpenAI is not configured. Set OPENAI_API_KEY (or OPENAI_BASE_URL for a compatible endpoint).",
    );
    this.name = "ProviderNotConfiguredError";
  }
}

export class StructuredOutputError extends Error {
  constructor(message: string, public readonly raw?: string) {
    super(message);
    this.name = "StructuredOutputError";
  }
}
