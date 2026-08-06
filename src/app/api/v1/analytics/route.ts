import { z } from "zod";
import { ApiError, handleApiError, requestIdFrom, successResponse } from "@/lib/api-response";
import { requireCompleteUser } from "@/lib/auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getAnalytics } from "@/lib/services/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({ range: z.enum(["7", "30", "90"]).default("30") });

export async function GET(request: Request) {
  try {
    const user = await requireCompleteUser();
    const limit = await rateLimit(user.id, { namespace: "analytics", limit: 120, windowMs: 60 * 60 * 1_000 });
    if (!limit.success) {
      throw new ApiError(429, "RATE_LIMITED", "Too many analytics requests.", { headers: rateLimitHeaders(limit) });
    }
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const data = await getAnalytics(user.id, user.profile.timezone, Number(query.range));
    return successResponse(data, { requestId: requestIdFrom(request), headers: rateLimitHeaders(limit) });
  } catch (error) {
    return handleApiError(error, request);
  }
}
