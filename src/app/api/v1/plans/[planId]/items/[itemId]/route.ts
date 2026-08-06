import { z } from "zod";
import { ApiError, handleApiError, requestIdFrom, successResponse } from "@/lib/api-response";
import { requireCompleteUser } from "@/lib/auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { assertSameOrigin, readJson } from "@/lib/request-security";
import { updateStudyPlanItem } from "@/lib/services/plans";

export const runtime = "nodejs";

type Context = { params: Promise<{ planId: string; itemId: string }> };

const idSchema = z.string().trim().min(1).max(64);
const updateSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "SKIPPED"]),
}).strict();

export async function PATCH(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireCompleteUser();
    const limit = await rateLimit(user.id, {
      namespace: "plan-items",
      limit: 120,
      windowMs: 60 * 60 * 1_000,
    });
    if (!limit.success) {
      throw new ApiError(429, "RATE_LIMITED", "Too many plan updates.", {
        headers: rateLimitHeaders(limit),
      });
    }
    const params = await context.params;
    const planId = idSchema.parse(params.planId);
    const itemId = idSchema.parse(params.itemId);
    const input = updateSchema.parse(await readJson(request, { maxBytes: 2 * 1_024 }));
    const result = await updateStudyPlanItem({
      userId: user.id,
      planId,
      itemId,
      status: input.status,
    });
    return successResponse(result, {
      requestId: requestIdFrom(request),
      headers: rateLimitHeaders(limit),
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}
