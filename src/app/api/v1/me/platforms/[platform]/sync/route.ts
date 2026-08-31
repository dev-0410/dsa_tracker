import { Platform, PlatformStatus } from "@prisma/client";
import { ApiError, handleApiError, requestIdFrom, successResponse } from "@/lib/api-response";
import { requireCompleteUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { UpstreamServiceError } from "@/lib/http";
import { fetchPlatformStats } from "@/lib/platforms";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-security";
import { seedMasteryFromPlatform } from "@/lib/services/external-mastery";
import { recordExternalSolves } from "@/lib/services/handle-onboarding";
import { commitPlatformSnapshot, type PlatformIdentityVersion } from "@/lib/services/platform-sync";
import { invalidatePublicProfileCache } from "@/lib/services/public-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ platform: string }> };

function parsePlatform(value: string) {
  const platform = value.toUpperCase();
  if (platform !== Platform.LEETCODE && platform !== Platform.CODEFORCES) {
    throw new ApiError(404, "PLATFORM_NOT_FOUND", "That platform is not supported.");
  }
  return platform;
}

export async function POST(request: Request, context: Context) {
  let identityVersion: PlatformIdentityVersion | null = null;
  try {
    assertSameOrigin(request);
    const user = await requireCompleteUser();
    const platform = parsePlatform((await context.params).platform);
    const limit = await rateLimit(`${user.id}:${platform}`, { namespace: "platform-sync", limit: 6, windowMs: 60 * 60 * 1_000 });
    if (!limit.success) {
      throw new ApiError(429, "SYNC_RATE_LIMITED", "Too many sync requests. Try again later.", { headers: rateLimitHeaders(limit) });
    }

    const identity = await db.platformIdentity.findUnique({
      where: { userId_platform: { userId: user.id, platform } },
      include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 1 } },
    });
    if (!identity) throw new ApiError(404, "IDENTITY_NOT_FOUND", "Connect this platform before syncing it.");
    identityVersion = {
      id: identity.id,
      normalizedHandle: identity.normalizedHandle,
      updatedAt: identity.updatedAt,
    };

    const configuredTtl = Number(process.env.PLATFORM_SYNC_TTL_SECONDS ?? 900);
    const ttlSeconds = Number.isFinite(configuredTtl)
      ? Math.min(86_400, Math.max(60, Math.trunc(configuredTtl)))
      : 900;
    if (
      identity.status === PlatformStatus.ACTIVE &&
      identity.lastSyncedAt &&
      Date.now() - identity.lastSyncedAt.getTime() < ttlSeconds * 1_000 &&
      identity.snapshots[0]
    ) {
      return successResponse({ identity, snapshot: identity.snapshots[0], cached: true }, {
        requestId: requestIdFrom(request),
        headers: rateLimitHeaders(limit),
      });
    }

    const stats = await fetchPlatformStats(platform, identity.handle);
    const snapshot = await commitPlatformSnapshot({ identity: identityVersion, stats, ttlSeconds });
    const seededTopics = await seedMasteryFromPlatform({ userId: user.id, platform, stats });
    let solvesRecorded = 0;
    let historyWarning: string | null = null;
    try {
      solvesRecorded = await recordExternalSolves({
        userId: user.id,
        platform,
        handle: stats.handle,
      });
    } catch (error) {
      // Aggregate stats and mastery are still useful if submission history is
      // temporarily unavailable. A later sync can fill the deduplication set.
      historyWarning =
        error instanceof UpstreamServiceError
          ? error.message
          : "Solved-problem history could not be refreshed.";
    }

    invalidatePublicProfileCache(user.profile.handle);
    return successResponse({ snapshot, cached: false, seededTopics, solvesRecorded, historyWarning }, {
      requestId: requestIdFrom(request),
      headers: rateLimitHeaders(limit),
    });
  } catch (error) {
    if (identityVersion && error instanceof UpstreamServiceError) {
      await db.platformIdentity.updateMany({
        where: identityVersion,
        data: { status: PlatformStatus.ERROR, lastErrorCode: error.code },
      });
      const current = await db.platformIdentity.findUnique({
        where: { id: identityVersion.id },
        select: { user: { select: { profile: { select: { handle: true } } } } },
      });
      invalidatePublicProfileCache(current?.user.profile?.handle);
      return handleApiError(new ApiError(error.code === "NOT_FOUND" ? 404 : 502, `PLATFORM_${error.code}`, error.message), request);
    }
    return handleApiError(error, request);
  }
}
