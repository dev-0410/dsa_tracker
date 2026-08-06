import { Platform, PlatformStatus } from "@prisma/client";
import { ApiError, handleApiError, requestIdFrom, successResponse } from "@/lib/api-response";
import { requireCompleteUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { platformProfileUrl } from "@/lib/platforms";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { assertSameOrigin, readJson } from "@/lib/request-security";
import { invalidatePublicProfileCache } from "@/lib/services/public-profile";
import { normalizePlatformHandle, platformIdentitySchema } from "@/lib/validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ platform: string }> };

function parsePlatform(value: string) {
  const platform = value.toUpperCase();
  if (platform !== Platform.LEETCODE && platform !== Platform.CODEFORCES) {
    throw new ApiError(404, "PLATFORM_NOT_FOUND", "That platform is not supported.");
  }
  return platform;
}

export async function PUT(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireCompleteUser();
    const platform = parsePlatform((await context.params).platform);
    const limit = await rateLimit(`${user.id}:${platform}`, {
      namespace: "platform-handle",
      limit: 20,
      windowMs: 60 * 60 * 1_000,
    });
    if (!limit.success) {
      throw new ApiError(429, "RATE_LIMITED", "Too many platform handle updates.", {
        headers: rateLimitHeaders(limit),
      });
    }
    const body = await readJson(request, { maxBytes: 4 * 1_024 });
    const handle = body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>).handle
      : undefined;
    const input = platformIdentitySchema.parse({ platform, handle });
    const normalizedHandle = normalizePlatformHandle(input.handle);
    const currentIdentity = await db.platformIdentity.findUnique({
      where: { userId_platform: { userId: user.id, platform } },
      select: { id: true, normalizedHandle: true },
    });
    const handleChanged = currentIdentity?.normalizedHandle !== normalizedHandle;
    const identity = await db.$transaction(async (transaction) => {
      if (currentIdentity && handleChanged) {
        await transaction.platformSnapshot.deleteMany({ where: { identityId: currentIdentity.id } });
      }
      return transaction.platformIdentity.upsert({
        where: { userId_platform: { userId: user.id, platform } },
        create: {
          userId: user.id,
          platform,
          handle: input.handle,
          normalizedHandle,
          profileUrl: platformProfileUrl(platform, input.handle),
          status: PlatformStatus.PENDING,
        },
        update: {
          handle: input.handle,
          normalizedHandle,
          profileUrl: platformProfileUrl(platform, input.handle),
          ...(handleChanged
            ? {
                status: PlatformStatus.PENDING,
                lastSyncedAt: null,
                lastErrorCode: null,
                nextSyncAt: null,
              }
            : {}),
        },
      });
    });
    invalidatePublicProfileCache(user.profile.handle);
    return successResponse(identity, {
      requestId: requestIdFrom(request),
      headers: rateLimitHeaders(limit),
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireCompleteUser();
    const platform = parsePlatform((await context.params).platform);
    const limit = await rateLimit(`${user.id}:${platform}`, {
      namespace: "platform-disconnect",
      limit: 20,
      windowMs: 60 * 60 * 1_000,
    });
    if (!limit.success) {
      throw new ApiError(429, "RATE_LIMITED", "Too many platform disconnect requests.", {
        headers: rateLimitHeaders(limit),
      });
    }
    const deleted = await db.platformIdentity.deleteMany({ where: { userId: user.id, platform } });
    if (!deleted.count) throw new ApiError(404, "IDENTITY_NOT_FOUND", "No connected profile was found.");
    invalidatePublicProfileCache(user.profile.handle);
    return successResponse(
      { disconnected: true, platform },
      { requestId: requestIdFrom(request), headers: rateLimitHeaders(limit) },
    );
  } catch (error) {
    return handleApiError(error, request);
  }
}
