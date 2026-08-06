import { z } from "zod";
import { ApiError, handleApiError, requestIdFrom, successResponse } from "@/lib/api-response";
import { requireCompleteUser } from "@/lib/auth";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { assertSameOrigin, readJson } from "@/lib/request-security";
import { createStudyPlan, getStudyPlans } from "@/lib/services/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const listQuerySchema = z.object({
  historyLimit: z.coerce.number().int().min(0).max(10).optional().default(4),
}).strict();

const createPlanSchema = z
  .object({
    title: z.string().trim().min(3).max(80).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    durationDays: z.coerce.number().int().min(7).max(28),
    problemsPerDay: z.coerce.number().int().min(1).max(2),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.durationDays * value.problemsPerDay > 28) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["problemsPerDay"],
        message: "A plan can contain at most 28 problems.",
      });
    }
  });

export async function GET(request: Request) {
  try {
    const user = await requireCompleteUser();
    const query = listQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const limit = await rateLimit(user.id, {
      namespace: "plans-read",
      limit: 120,
      windowMs: 60 * 60 * 1_000,
    });
    if (!limit.success) {
      throw new ApiError(429, "RATE_LIMITED", "Too many plan requests.", {
        headers: rateLimitHeaders(limit),
      });
    }
    const result = await getStudyPlans({ userId: user.id, historyLimit: query.historyLimit });
    return successResponse(result, {
      requestId: requestIdFrom(request),
      headers: rateLimitHeaders(limit),
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireCompleteUser();
    const limit = await rateLimit(user.id, {
      namespace: "plans-create",
      limit: 6,
      windowMs: 60 * 60 * 1_000,
    });
    if (!limit.success) {
      throw new ApiError(429, "PLAN_RATE_LIMITED", "You can build six plans per hour.", {
        headers: rateLimitHeaders(limit),
      });
    }
    const input = createPlanSchema.parse(await readJson(request, { maxBytes: 4 * 1_024 }));
    const result = await createStudyPlan({
      userId: user.id,
      timezone: user.profile.timezone,
      experienceLevel: user.profile.experienceLevel,
      learningGoal: user.profile.learningGoal,
      targetDate: user.profile.targetDate,
      minutesPerDay: user.profile.minutesPerDay,
      input,
    });
    return successResponse(result, {
      status: 201,
      requestId: requestIdFrom(request),
      headers: rateLimitHeaders(limit),
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}
