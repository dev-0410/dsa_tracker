import "server-only";

import type { ZodType } from "zod";

export class UpstreamServiceError extends Error {
  constructor(
    public readonly code: "TIMEOUT" | "RATE_LIMITED" | "NOT_FOUND" | "BAD_RESPONSE" | "UNAVAILABLE",
    message: string,
    public readonly retryable = true,
  ) {
    super(message);
    this.name = "UpstreamServiceError";
  }
}

type FetchJsonOptions<T> = {
  schema: ZodType<T>;
  timeoutMs?: number;
  maxBytes?: number;
};

export async function fetchValidatedJson<T>(
  url: URL,
  init: RequestInit,
  { schema, timeoutMs = 8_000, maxBytes = 2_000_000 }: FetchJsonOptions<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "Invariant/2.0 (+https://github.com/Pheonix-dev0410/dsa_tracker)",
        ...init.headers,
      },
    });

    if (response.status === 404) {
      throw new UpstreamServiceError("NOT_FOUND", "The connected profile was not found.", false);
    }
    if (response.status === 429) {
      throw new UpstreamServiceError("RATE_LIMITED", "The platform is rate limiting sync requests.");
    }
    if (!response.ok) {
      throw new UpstreamServiceError("UNAVAILABLE", "The platform is temporarily unavailable.");
    }

    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (declaredSize > maxBytes) {
      throw new UpstreamServiceError("BAD_RESPONSE", "The platform response exceeded the safe size limit.");
    }

    const body = await response.text();
    if (Buffer.byteLength(body, "utf8") > maxBytes) {
      throw new UpstreamServiceError("BAD_RESPONSE", "The platform response exceeded the safe size limit.");
    }

    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      throw new UpstreamServiceError("BAD_RESPONSE", "The platform returned malformed data.");
    }

    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new UpstreamServiceError("BAD_RESPONSE", "The platform response did not match the expected format.");
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof UpstreamServiceError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new UpstreamServiceError("TIMEOUT", "The platform sync timed out.");
    }
    throw new UpstreamServiceError("UNAVAILABLE", "The platform could not be reached.");
  } finally {
    clearTimeout(timer);
  }
}
