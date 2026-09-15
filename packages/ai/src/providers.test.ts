import type Anthropic from "@anthropic-ai/sdk";
import type OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { StructuredOutputError } from "./types";

const schema = z.object({ answer: z.string() });
const req = { system: "sys", messages: [{ role: "user" as const, content: "hi" }] };

describe("AnthropicProvider", () => {
  it("joins text blocks from chat", async () => {
    const create = vi.fn().mockResolvedValue({
      content: [
        { type: "text", text: "Hello " },
        { type: "text", text: "there" },
      ],
    });
    const provider = new AnthropicProvider("claude-opus-5", { messages: { create } } as unknown as Anthropic);
    await expect(provider.chat(req)).resolves.toEqual({ text: "Hello there" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: "claude-opus-5", system: "sys" }));
  });

  it("yields only text deltas when streaming", async () => {
    async function* events() {
      yield { type: "message_start" };
      yield { type: "content_block_delta", delta: { type: "text_delta", text: "a" } };
      yield { type: "content_block_delta", delta: { type: "thinking_delta", thinking: "x" } };
      yield { type: "content_block_delta", delta: { type: "text_delta", text: "b" } };
    }
    const provider = new AnthropicProvider("m", { messages: { stream: () => events() } } as unknown as Anthropic);
    const out: string[] = [];
    for await (const t of provider.stream(req)) out.push(t);
    expect(out).toEqual(["a", "b"]);
  });

  it("retries structured output once, then fails", async () => {
    const parse = vi
      .fn()
      .mockResolvedValueOnce({ stop_reason: "end_turn", parsed_output: { wrong: 1 } })
      .mockResolvedValueOnce({ stop_reason: "end_turn", parsed_output: { answer: "ok" } });
    const provider = new AnthropicProvider("m", { messages: { parse } } as unknown as Anthropic);
    await expect(provider.structured(req, schema, "answer")).resolves.toEqual({ answer: "ok" });
    expect(parse).toHaveBeenCalledTimes(2);

    parse.mockReset().mockResolvedValue({ stop_reason: "end_turn", parsed_output: null });
    await expect(provider.structured(req, schema, "answer")).rejects.toBeInstanceOf(StructuredOutputError);
  });
});

describe("OpenAIProvider", () => {
  it("prepends the system message", async () => {
    const create = vi.fn().mockResolvedValue({ choices: [{ message: { content: "yo" } }] });
    const provider = new OpenAIProvider("gpt", { chat: { completions: { create } } } as unknown as OpenAI);
    await expect(provider.chat(req)).resolves.toEqual({ text: "yo" });
    expect(create.mock.calls[0]![0].messages[0]).toEqual({ role: "system", content: "sys" });
  });

  it("parses JSON structured output with a retry on invalid JSON", async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({ choices: [{ message: { content: "not json" } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: '{"answer":"42"}' } }] });
    const provider = new OpenAIProvider("gpt", { chat: { completions: { create } } } as unknown as OpenAI);
    await expect(provider.structured(req, schema, "answer")).resolves.toEqual({ answer: "42" });
    const format = create.mock.calls[0]![0].response_format;
    expect(format.type).toBe("json_schema");
    expect(format.json_schema.name).toBe("answer");
  });
});
