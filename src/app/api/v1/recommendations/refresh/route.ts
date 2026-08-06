import { ApiError, handleApiError, requestIdFrom, successResponse } from "@/lib/api-response";
import { requireCompleteUser } from "@/lib/auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { assertSameOrigin, readJson } from "@/lib/request-security";
import { getRecommendations } from "@/lib/services/recommendations";
import { recommendationQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireCompleteUser();
    const limit = await rateLimit(user.id, { namespace: "recommendation-refresh", limit: 4, windowMs: 60 * 60 * 1_000 });
    if (!limit.success) {
      throw new ApiError(429, "REFRESH_RATE_LIMITED", "You can refresh the queue four times per hour.", { headers: rateLimitHeaders(limit) });
    }
    const body = await readJson(request, { maxBytes: 4 * 1_024, allowEmpty: true });
    const query = recommendationQuerySchema.parse({ ...(body as Record<string, unknown>), forceRefresh: true });
    const result = await getRecommendations({
      userId: user.id,
      experienceLevel: user.profile.experienceLevel,
      learningGoal: user.profile.learningGoal,
      targetDate: user.profile.targetDate,
      mode: query.mode,
      limit: query.limit,
      minutesAvailable: query.minutesAvailable ?? user.profile.minutesPerDay,
      includePremium: query.includePremium,
      forceRefresh: true,
    });
    return successResponse(result, { requestId: requestIdFrom(request), headers: rateLimitHeaders(limit) });
  } catch (error) {
    return handleApiError(error, request);
  }
}
