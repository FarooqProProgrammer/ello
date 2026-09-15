"use client";

export interface ApiError {
  error: string;
  code?: string;
}

export class ClientApiError extends Error {
  constructor(message: string, public code?: string, public status?: number) {
    super(message);
  }
}

export interface RequestOptions {
  /**
   * Automatic retries for network errors and 5xx responses (default 2).
   * Use 0 for requests that must not run twice, e.g. ones that create records.
   */
  retries?: number;
}

const RETRY_DELAYS_MS = [700, 1800, 3500];

/** Failures that retrying can't fix. */
const NON_RETRYABLE_CODES = new Set(["provider_not_configured", "voice_disabled", "no_secret"]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function postJson<T>(
  url: string,
  body: unknown,
  method: "POST" | "PATCH" | "PUT" = "POST",
  { retries = 2 }: RequestOptions = {},
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const canRetry = attempt < retries;
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      if (canRetry) {
        await sleep(RETRY_DELAYS_MS[attempt] ?? 3500);
        continue;
      }
      throw new ClientApiError("Network error — check your connection and try again.");
    }

    if (res.ok) return (await res.json()) as T;

    const error = await toError(res);
    if (canRetry && res.status >= 500 && !NON_RETRYABLE_CODES.has(error.code ?? "")) {
      await sleep(RETRY_DELAYS_MS[attempt] ?? 3500);
      continue;
    }
    throw error;
  }
}

export async function toError(res: Response): Promise<ClientApiError> {
  try {
    const data = (await res.json()) as ApiError;
    return new ClientApiError(data.error, data.code, res.status);
  } catch {
    return new ClientApiError(`Request failed (${res.status})`, undefined, res.status);
  }
}
