import { Prisma } from "@prisma/client";
import { ApiError, handleApiError, requestIdFrom, successResponse } from "@/lib/api-response";
import { requireCompleteUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { assertSameOrigin, readJson } from "@/lib/request-security";
import { invalidatePublicProfileCache } from "@/lib/services/public-profile";
import { focusTopicsSchema } from "@/lib/validation";

export const runtime = "nodejs";

const initialTheta = {
  BEGINNER: -1.25,
  INTERMEDIATE: -0.25,
  ADVANCED: 0.65,
} as const;

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireCompleteUser();
    const limit = await rateLimit(user.id, {
      namespace: "focus-topics",
      limit: 20,
      windowMs: 60 * 60 * 1_000,
    });
    if (!limit.success) {
      throw new ApiError(429, "RATE_LIMITED", "Too many focus-topic updates.", {
        headers: rateLimitHeaders(limit),
      });
    }
    const input = focusTopicsSchema.parse(await readJson(request));

    const topics = await db.topic.findMany({
      where: { id: { in: input.topicIds } },
      select: { id: true, slug: true, name: true, sortOrder: true },
    });
    if (topics.length !== input.topicIds.length) {
      throw new ApiError(422, "INVALID_TOPICS", "One or more selected topics no longer exist.");
    }

    const theta = initialTheta[user.profile.experienceLevel];
    const mastery = 1 / (1 + Math.exp(-theta));
    const now = new Date();
    await db.$transaction(
      async (transaction) => {
        await transaction.userTopicPreference.deleteMany({ where: { userId: user.id } });
        await transaction.userTopicPreference.createMany({
          data: input.topicIds.map((topicId, index) => ({
            userId: user.id,
            topicId,
            priority: Math.max(0.55, 1 - index * 0.06),
            baselineConfidence:
              user.profile.experienceLevel === "BEGINNER"
                ? 1
                : user.profile.experienceLevel === "INTERMEDIATE"
                  ? 2
                  : 3,
          })),
        });
        for (const topicId of input.topicIds) {
          await transaction.userTopicMastery.upsert({
            where: { userId_topicId: { userId: user.id, topicId } },
            create: {
              userId: user.id,
              topicId,
              theta,
              mastery,
              uncertainty: 1,
            },
            update: {},
          });
        }
        await transaction.recommendationRun.updateMany({
          where: { userId: user.id, expiresAt: { gt: now } },
          data: { expiresAt: now },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    const byId = new Map(topics.map((topic) => [topic.id, topic]));
    invalidatePublicProfileCache(user.profile.handle);
    return successResponse(
      { topics: input.topicIds.map((id) => byId.get(id)!) },
      { requestId: requestIdFrom(request), headers: rateLimitHeaders(limit) },
    );
  } catch (error) {
    return handleApiError(error, request);
  }
}
