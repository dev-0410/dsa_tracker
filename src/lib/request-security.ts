import { ApiError } from "@/lib/api-response";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  let configuredOrigin = requestOrigin;
  if (process.env.NEXTAUTH_URL) {
    try {
      configuredOrigin = new URL(process.env.NEXTAUTH_URL).origin;
    } catch {
      throw new ApiError(503, "INVALID_SERVER_CONFIGURATION", "The application origin is not configured correctly.");
    }
  }

  if (!origin) {
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(403, "ORIGIN_REQUIRED", "A valid request origin is required.");
    }
    return;
  }

  if (origin !== requestOrigin && origin !== configuredOrigin) {
    throw new ApiError(403, "INVALID_ORIGIN", "The request origin is not allowed.");
  }
}

export function clientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export async function readJson(
  request: Request,
  options: { maxBytes?: number; allowEmpty?: boolean } = {},
): Promise<unknown> {
  const maxBytes = options.maxBytes ?? 64 * 1_024;
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", `JSON request bodies are limited to ${maxBytes} bytes.`);
  }

  if (!request.body) {
    if (options.allowEmpty) return {};
    throw new ApiError(400, "EMPTY_BODY", "A JSON request body is required.");
  }
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Use application/json for this request.");
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let received = 0;
  let text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        throw new ApiError(413, "PAYLOAD_TOO_LARGE", `JSON request bodies are limited to ${maxBytes} bytes.`);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "INVALID_BODY", "The request body is not valid UTF-8.");
  }

  if (!text.trim()) {
    if (options.allowEmpty) return {};
    throw new ApiError(400, "EMPTY_BODY", "A JSON request body is required.");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(400, "INVALID_JSON", "The request body is not valid JSON.");
  }
}
