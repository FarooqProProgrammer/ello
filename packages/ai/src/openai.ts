import OpenAI from "openai";
import { z, type ZodType } from "zod";
import { StructuredOutputError, type AIProvider, type ChatRequest, type ChatResponse } from "./types";

/**
 * Uses the Chat Completions API because it is what OpenAI-compatible
 * endpoints (OpenRouter, Groq, Ollama, vLLM...) implement.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai";

  constructor(
    readonly model: string,
    private readonly client: OpenAI = new OpenAI(),
  ) {}

  private messages(req: ChatRequest): OpenAI.ChatCompletionMessageParam[] {
    return [
      ...(req.system ? [{ role: "system" as const, content: req.system }] : []),
      ...req.messages.map((m) => ({ role: m.role, content: m.content })),
    ];
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: this.messages(req),
      ...(req.maxTokens ? { max_completion_tokens: req.maxTokens } : {}),
    });
    return { text: completion.choices[0]?.message.content ?? "" };
  }

  async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create(
      {
        model: this.model,
        messages: this.messages(req),
        stream: true,
        ...(req.maxTokens ? { max_completion_tokens: req.maxTokens } : {}),
      },
      { signal },
    );
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  async structured<T>(req: ChatRequest, schema: ZodType<T>, schemaName: string): Promise<T> {
    const jsonSchema = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
    delete jsonSchema.$schema;
    let lastError = "";
    let raw = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: this.messages(req),
        response_format: {
          type: "json_schema",
          json_schema: { name: schemaName, schema: jsonSchema, strict: true },
        },
        ...(req.maxTokens ? { max_completion_tokens: req.maxTokens } : {}),
      });
      const message = completion.choices[0]?.message;
      if (message?.refusal) throw new StructuredOutputError("The model declined this request.");
      raw = message?.content ?? "";
      try {
        const parsed = schema.safeParse(JSON.parse(raw));
        if (parsed.success) return parsed.data;
        lastError = parsed.error.message;
      } catch (err) {
        lastError = `Invalid JSON: ${(err as Error).message}`;
      }
    }
    throw new StructuredOutputError(`Model output did not match schema: ${lastError}`, raw);
  }
}
