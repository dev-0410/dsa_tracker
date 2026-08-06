import { ApiError, handleApiError, requestIdFrom, successResponse } from "@/lib/api-response";
import { requireCompleteUser } from "@/lib/auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { assertSameOrigin, readJson } from "@/lib/request-security";
import { recordRecommendationEvent } from "@/lib/services/recommendations";
import { recommendationEventSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireCompleteUser();
    const limit = await rateLimit(user.id, { namespace: "recommendation-events", limit: 300, windowMs: 60 * 60 * 1_000 });
    if (!limit.success) {
      throw new ApiError(429, "RATE_LIMITED", "Too many recommendation events.", { headers: rateLimitHeaders(limit) });
    }
    const input = recommendationEventSchema.parse(await readJson(request, { maxBytes: 4 * 1_024 }));
    const result = await recordRecommendationEvent({ userId: user.id, ...input });
    return successResponse(result, {
      status: result.replayed ? 200 : 201,
      requestId: requestIdFrom(request),
      headers: rateLimitHeaders(limit),
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}
