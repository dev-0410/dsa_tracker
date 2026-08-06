import { Prisma, PlatformStatus } from "@prisma/client";
import { ApiError, handleApiError, requestIdFrom, successResponse } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { assertSameOrigin, readJson } from "@/lib/request-security";
import { invalidatePublicProfileCache } from "@/lib/services/public-profile";
import { onboardingSchema, profileUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const profileInclude = {
  profile: true,
  topicPreferences: {
    include: { topic: true },
    orderBy: { topic: { sortOrder: "asc" } },
  },
  platformIdentities: {
    include: {
      snapshots: { orderBy: { capturedAt: "desc" }, take: 1 },
    },
    orderBy: { platform: "asc" },
  },
} satisfies Prisma.UserInclude;

function serializeUser(user: Prisma.UserGetPayload<{ include: typeof profileInclude }>) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    profile: user.profile,
    topics: user.topicPreferences.map((preference) => ({
      id: preference.topic.id,
      slug: preference.topic.slug,
      name: preference.topic.name,
      priority: preference.priority,
      baselineConfidence: preference.baselineConfidence,
    })),
    platforms: user.platformIdentities.map((identity) => ({
      id: identity.id,
      platform: identity.platform,
      handle: identity.handle,
      profileUrl: identity.profileUrl,
      status: identity.status,
      lastSyncedAt: identity.lastSyncedAt,
      lastErrorCode: identity.lastErrorCode,
      stats: identity.snapshots[0] ?? null,
    })),
  };
}

export async function GET(request: Request) {
  try {
    const current = await requireUser();
    const user = await db.user.findUniqueOrThrow({
      where: { id: current.id },
      include: profileInclude,
    });
    return successResponse(serializeUser(user), { requestId: requestIdFrom(request) });
  } catch (error) {
    return handleApiError(error, request);
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const current = await requireUser();
    if (current.profile?.onboardingCompletedAt) {
      throw new ApiError(409, "ALREADY_ONBOARDED", "This account has already completed onboarding.");
    }
    const limit = await rateLimit(current.id, {
      namespace: "onboarding",
      limit: 10,
      windowMs: 60 * 60 * 1_000,
    });
    if (!limit.success) {
      throw new ApiError(429, "RATE_LIMITED", "Too many onboarding attempts.", {
        headers: rateLimitHeaders(limit),
      });
    }
    const input = onboardingSchema.parse(await readJson(request));

    const topics = await db.topic.findMany({
      where: { id: { in: input.topicIds } },
      select: { id: true },
    });
    if (topics.length !== input.topicIds.length) {
      throw new ApiError(422, "INVALID_TOPICS", "One or more selected topics no longer exist.");
    }

    const initialTheta = {
      BEGINNER: -1.25,
      INTERMEDIATE: -0.25,
      ADVANCED: 0.65,
    }[input.experienceLevel];
    const initialMastery = 1 / (1 + Math.exp(-initialTheta));
    const completedAt = new Date();

    await db.$transaction(
      async (transaction) => {
        await transaction.userProfile.upsert({
          where: { userId: current.id },
          create: {
            userId: current.id,
            handle: input.handle,
            displayName: input.displayName,
            bio: input.bio ?? null,
            timezone: input.timezone,
            currentRole: input.currentRole ?? null,
            targetRole: input.targetRole,
            experienceLevel: input.experienceLevel,
            learningGoal: input.learningGoal,
            weeklyTarget: input.weeklyTarget,
            minutesPerDay: input.minutesPerDay,
            preferredLanguage: input.preferredLanguage,
            targetDate: input.targetDate ?? null,
            isPublic: input.isPublic,
            onboardingCompletedAt: completedAt,
          },
          update: {
            handle: input.handle,
            displayName: input.displayName,
            bio: input.bio ?? null,
            timezone: input.timezone,
            currentRole: input.currentRole ?? null,
            targetRole: input.targetRole,
            experienceLevel: input.experienceLevel,
            learningGoal: input.learningGoal,
            weeklyTarget: input.weeklyTarget,
            minutesPerDay: input.minutesPerDay,
            preferredLanguage: input.preferredLanguage,
            targetDate: input.targetDate ?? null,
            isPublic: input.isPublic,
            onboardingCompletedAt: completedAt,
          },
        });

        await transaction.userTopicPreference.deleteMany({ where: { userId: current.id } });
        await transaction.userTopicPreference.createMany({
          data: input.topicIds.map((topicId, index) => ({
            userId: current.id,
            topicId,
            priority: Math.max(0.55, 1 - index * 0.06),
            baselineConfidence: input.experienceLevel === "BEGINNER" ? 1 : input.experienceLevel === "INTERMEDIATE" ? 2 : 3,
          })),
        });

        for (const topicId of input.topicIds) {
          await transaction.userTopicMastery.upsert({
            where: { userId_topicId: { userId: current.id, topicId } },
            create: {
              userId: current.id,
              topicId,
              theta: initialTheta,
              mastery: initialMastery,
              uncertainty: 1,
            },
            update: {},
          });
        }

        await transaction.platformIdentity.deleteMany({
          where: {
            userId: current.id,
            platform: { notIn: input.platformIdentities.map((identity) => identity.platform) },
          },
        });
        for (const identity of input.platformIdentities) {
          const normalizedHandle = identity.handle.trim().toLocaleLowerCase("en-US");
          const existingIdentity = await transaction.platformIdentity.findUnique({
            where: { userId_platform: { userId: current.id, platform: identity.platform } },
            select: { id: true, normalizedHandle: true },
          });
          const handleChanged = existingIdentity?.normalizedHandle !== normalizedHandle;
          if (existingIdentity && handleChanged) {
            await transaction.platformSnapshot.deleteMany({ where: { identityId: existingIdentity.id } });
          }
          const profileUrl =
            identity.platform === "LEETCODE"
              ? `https://leetcode.com/u/${encodeURIComponent(identity.handle)}/`
              : `https://codeforces.com/profile/${encodeURIComponent(identity.handle)}`;
          await transaction.platformIdentity.upsert({
            where: { userId_platform: { userId: current.id, platform: identity.platform } },
            create: {
              userId: current.id,
              platform: identity.platform,
              handle: identity.handle,
              normalizedHandle,
              profileUrl,
              status: PlatformStatus.PENDING,
            },
            update: {
              handle: identity.handle,
              normalizedHandle,
              profileUrl,
              status: PlatformStatus.PENDING,
              lastSyncedAt: handleChanged ? null : undefined,
              lastErrorCode: null,
              nextSyncAt: null,
            },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    const user = await db.user.findUniqueOrThrow({ where: { id: current.id }, include: profileInclude });
    invalidatePublicProfileCache(current.profile?.handle, user.profile?.handle);
    return successResponse(serializeUser(user), {
      status: 201,
      requestId: requestIdFrom(request),
      headers: rateLimitHeaders(limit),
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const current = await requireUser();
    const limit = await rateLimit(current.id, {
      namespace: "profile-update",
      limit: 60,
      windowMs: 60 * 60 * 1_000,
    });
    if (!limit.success) {
      throw new ApiError(429, "RATE_LIMITED", "Too many profile updates.", {
        headers: rateLimitHeaders(limit),
      });
    }
    const input = profileUpdateSchema.parse(await readJson(request));
    const now = new Date();
    const [profile] = await db.$transaction([
      db.userProfile.update({ where: { userId: current.id }, data: input }),
      db.recommendationRun.updateMany({
        where: { userId: current.id, expiresAt: { gt: now } },
        data: { expiresAt: now },
      }),
    ]);
    invalidatePublicProfileCache(current.profile?.handle, profile.handle);
    return successResponse(profile, {
      requestId: requestIdFrom(request),
      headers: rateLimitHeaders(limit),
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}
