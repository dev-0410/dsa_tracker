import { Platform } from "@prisma/client";
import { z } from "zod";
import { ApiError, handleApiError, requestIdFrom, successResponse } from "@/lib/api-response";
import { requireCompleteUser } from "@/lib/auth";
import { UpstreamServiceError } from "@/lib/http";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-security";
import { connectPlatformHandle, type ConnectResult } from "@/lib/services/handle-onboarding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handleSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9._-]+$/, "Handles use only letters, numbers, dots, underscores, and dashes.");

const bodySchema = z
  .object({
    leetcode: handleSchema.optional(),
    codeforces: handleSchema.optional(),
  })
  .refine((value) => value.leetcode || value.codeforces, {
    message: "Provide at least one platform handle.",
  });

/**
 * Connects one or both platform handles and returns the imported profile.
 *
 * Only public profile data is read, so no platform password is ever requested
 * or stored. The handle itself is the only credential involved.
 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireCompleteUser();
    const limit = await rateLimit(user.id, {
      namespace: "connect",
      limit: 10,
      windowMs: 60 * 60 * 1_000,
    });
    if (!limit.success) {
      throw new ApiError(429, "RATE_LIMITED", "Too many connection attempts. Try again later.", {
        headers: rateLimitHeaders(limit),
      });
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError(422, "INVALID_BODY", parsed.error.issues[0]?.message ?? "Invalid handles.");
    }

    const { leetcode, codeforces } = parsed.data;

    const results: ConnectResult[] = [];
    const failures: Array<{ platform: string; message: string }> = [];

    for (const [platform, handle] of [
      [Platform.LEETCODE, leetcode],
      [Platform.CODEFORCES, codeforces],
    ] as const) {
      if (!handle) continue;
      try {
        results.push(await connectPlatformHandle({ userId: user.id, platform, handle }));
      } catch (error) {
        // One bad handle should not discard a good one.
        const message =
          error instanceof UpstreamServiceError
            ? error.message
            : "That profile could not be read right now.";
        failures.push({ platform, message });
      }
    }

    if (results.length === 0) {
      throw new ApiError(
        404,
        "NO_PROFILE_CONNECTED",
        failures[0]?.message ?? "No profile could be connected.",
      );
    }

    return successResponse(
      { userId: user.id, connected: results, failures },
      { requestId: requestIdFrom(request), headers: rateLimitHeaders(limit) },
    );
  } catch (error) {
    return handleApiError(error, request);
  }
}
