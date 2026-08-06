import { ApiError, handleApiError, requestIdFrom, successResponse } from "@/lib/api-response";
import { requireCompleteUser } from "@/lib/auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getAnalytics } from "@/lib/services/analytics";
import { getRecommendations } from "@/lib/services/recommendations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireCompleteUser();
    const limit = await rateLimit(user.id, { namespace: "dashboard", limit: 120, windowMs: 60 * 60 * 1_000 });
    if (!limit.success) {
      throw new ApiError(429, "RATE_LIMITED", "Too many dashboard requests.", { headers: rateLimitHeaders(limit) });
    }
    const [analytics, recommendations] = await Promise.all([
      getAnalytics(user.id, user.profile.timezone, 30),
      getRecommendations({
        userId: user.id,
        experienceLevel: user.profile.experienceLevel,
        learningGoal: user.profile.learningGoal,
        targetDate: user.profile.targetDate,
        mode: "DAILY",
        limit: Math.min(8, Math.max(3, user.profile.weeklyTarget)),
        minutesAvailable: user.profile.minutesPerDay,
      }),
    ]);
    return successResponse(
      { analytics, recommendations },
      { requestId: requestIdFrom(request), headers: rateLimitHeaders(limit) },
    );
  } catch (error) {
    return handleApiError(error, request);
  }
}
