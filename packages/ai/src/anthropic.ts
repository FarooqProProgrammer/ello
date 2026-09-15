import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { ZodType } from "zod";
import { StructuredOutputError, type AIProvider, type ChatRequest, type ChatResponse } from "./types";

const DEFAULT_MAX_TOKENS = 16000;
const STREAM_MAX_TOKENS = 64000;

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";

  constructor(
    readonly model: string,
    private readonly client: Anthropic = new Anthropic(),
  ) {}

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
      ...(req.system ? { system: req.system } : {}),
      messages: req.messages,
    });
    return { text: textOf(response.content) };
  }

  async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<string> {
    const stream = this.client.messages.stream(
      {
        model: this.model,
        max_tokens: req.maxTokens ?? STREAM_MAX_TOKENS,
        ...(req.system ? { system: req.system } : {}),
        messages: req.messages,
      },
      { signal },
    );
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  }

  async structured<T>(req: ChatRequest, schema: ZodType<T>, _schemaName: string): Promise<T> {
    let lastError = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await this.client.messages.parse({
        model: this.model,
        max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
        ...(req.system ? { system: req.system } : {}),
        messages: req.messages,
        output_config: { format: zodOutputFormat(schema) },
      });
      if (response.stop_reason === "refusal") {
        throw new StructuredOutputError("The model declined this request.");
      }
      const parsed = schema.safeParse(response.parsed_output);
      if (parsed.success) return parsed.data;
      lastError = parsed.error.message;
    }
    throw new StructuredOutputError(`Model output did not match schema: ${lastError}`);
  }
}

function textOf(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}
