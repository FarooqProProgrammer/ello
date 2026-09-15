import { ProviderNotConfiguredError, StructuredOutputError } from "@repo/ai";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new HttpError(400, "Request body must be JSON.");
  }
  const result = schema.safeParse(json);
  if (!result.success) throw new HttpError(400, result.error.issues.map((i) => i.message).join("; "));
  return result.data;
}

/** Maps known errors to JSON responses the UI can act on. */
export function errorResponse(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  if (err instanceof ProviderNotConfiguredError) {
    return NextResponse.json({ error: err.message, code: "provider_not_configured" }, { status: 503 });
  }
  if (err instanceof StructuredOutputError) {
    return NextResponse.json({ error: err.message, code: "bad_model_output" }, { status: 502 });
  }
  console.error(err);
  // In development show the real cause so failures can be diagnosed from the UI.
  const detail = process.env.NODE_ENV !== "production" && err instanceof Error ? ` (${err.message.split("\n")[0]})` : "";
  return NextResponse.json({ error: `Something went wrong. Please try again.${detail}`, code: "internal" }, { status: 500 });
}
