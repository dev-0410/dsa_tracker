import { ApiError, handleApiError, requestIdFrom, successResponse } from "@/lib/api-response";
import { requireCompleteUser } from "@/lib/auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getRecommendations } from "@/lib/services/recommendations";
import { recommendationQuerySchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const recommendationGetQuerySchema = recommendationQuerySchema.omit({ forceRefresh: true });

export async function GET(request: Request) {
  try {
    const user = await requireCompleteUser();
    const query = recommendationGetQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const limit = await rateLimit(user.id, { namespace: "recommendations", limit: 60, windowMs: 60 * 60 * 1_000 });
    if (!limit.success) {
      throw new ApiError(429, "RATE_LIMITED", "Too many recommendation requests.", { headers: rateLimitHeaders(limit) });
    }
    const result = await getRecommendations({
      userId: user.id,
      experienceLevel: user.profile.experienceLevel,
      learningGoal: user.profile.learningGoal,
      targetDate: user.profile.targetDate,
      mode: query.mode,
      limit: query.limit,
      minutesAvailable: query.minutesAvailable ?? user.profile.minutesPerDay,
      includePremium: query.includePremium,
    });
    return successResponse(result, { requestId: requestIdFrom(request), headers: rateLimitHeaders(limit) });
  } catch (error) {
    return handleApiError(error, request);
  }
}
