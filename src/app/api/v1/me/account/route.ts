import { z } from "zod";
import { ApiError, handleApiError, requestIdFrom, successResponse } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { assertSameOrigin, readJson } from "@/lib/request-security";
import { invalidatePublicProfileCache } from "@/lib/services/public-profile";

export const runtime = "nodejs";

const deletionSchema = z.object({ confirmation: z.literal("DELETE") }).strict();

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const current = await requireUser();
    const limit = await rateLimit(current.id, {
      namespace: "account-delete",
      limit: 3,
      windowMs: 24 * 60 * 60 * 1_000,
    });
    if (!limit.success) {
      throw new ApiError(429, "RATE_LIMITED", "Too many account deletion requests.", {
        headers: rateLimitHeaders(limit),
      });
    }
    deletionSchema.parse(await readJson(request, { maxBytes: 1_024 }));

    await db.user.delete({ where: { id: current.id } });
    invalidatePublicProfileCache(current.profile?.handle);
    return successResponse(
      { deleted: true },
      { requestId: requestIdFrom(request), headers: rateLimitHeaders(limit) },
    );
  } catch (error) {
    return handleApiError(error, request);
  }
}
