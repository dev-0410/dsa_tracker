import { z } from "zod";
import { ApiError, handleApiError, requestIdFrom, successResponse } from "@/lib/api-response";
import { requireCompleteUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { assertSameOrigin, readJson } from "@/lib/request-security";
import { recordAttempt } from "@/lib/services/attempts";
import { invalidatePublicProfileCache } from "@/lib/services/public-profile";
import { attemptSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const historyQuery = z.object({
  cursor: z.string().trim().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: Request) {
  try {
    const user = await requireCompleteUser();
    const rate = await rateLimit(user.id, { namespace: "attempt-history", limit: 120, windowMs: 60 * 60 * 1_000 });
    if (!rate.success) {
      throw new ApiError(429, "RATE_LIMITED", "Too many attempt history requests.", { headers: rateLimitHeaders(rate) });
    }
    const query = historyQuery.parse(Object.fromEntries(new URL(request.url).searchParams));
    const attempts = await db.attempt.findMany({
      where: { userId: user.id },
      orderBy: [{ completedAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            slug: true,
            difficulty: true,
            platform: true,
            url: true,
            topics: { include: { topic: true }, orderBy: { weight: "desc" } },
          },
        },
      },
    });
    const hasMore = attempts.length > query.limit;
    const items = attempts.slice(0, query.limit);
    return successResponse(
      { items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null },
      { requestId: requestIdFrom(request), headers: rateLimitHeaders(rate) },
    );
  } catch (error) {
    return handleApiError(error, request);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireCompleteUser();
    const limit = await rateLimit(user.id, { namespace: "attempts", limit: 60, windowMs: 60 * 60 * 1_000 });
    if (!limit.success) {
      throw new ApiError(429, "RATE_LIMITED", "Too many attempt updates.", { headers: rateLimitHeaders(limit) });
    }
    const input = attemptSchema.parse(await readJson(request, { maxBytes: 8 * 1_024 }));
    const headerKey = request.headers.get("idempotency-key")?.trim();
    if (headerKey && headerKey !== input.idempotencyKey) {
      throw new ApiError(400, "IDEMPOTENCY_KEY_MISMATCH", "The idempotency header and request body must match.");
    }
    const result = await recordAttempt({
      userId: user.id,
      timezone: user.profile.timezone,
      experienceLevel: user.profile.experienceLevel,
      input,
    });
    invalidatePublicProfileCache(user.profile.handle);
    return successResponse(result, {
      status: result.replayed ? 200 : 201,
      requestId: requestIdFrom(request),
      headers: rateLimitHeaders(limit),
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}
