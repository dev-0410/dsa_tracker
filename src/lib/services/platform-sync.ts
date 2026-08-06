import "server-only";

import { PlatformStatus } from "@prisma/client";
import { ApiError } from "@/lib/api-response";
import { db } from "@/lib/db";
import { normalizePlatformHandle, type PlatformStats } from "@/lib/platforms";

export type PlatformIdentityVersion = {
  id: string;
  normalizedHandle: string;
  updatedAt: Date;
};

/**
 * Commits fetched stats only if the identity is byte-for-byte the version that
 * initiated the upstream request. This prevents a slow response for an old
 * handle from overwriting a newly connected handle.
 */
export async function commitPlatformSnapshot(options: {
  identity: PlatformIdentityVersion;
  stats: PlatformStats;
  ttlSeconds: number;
  now?: Date;
}) {
  const now = options.now ?? new Date();
  return db.$transaction(async (transaction) => {
    const claimed = await transaction.platformIdentity.updateMany({
      where: options.identity,
      data: {
        handle: options.stats.handle,
        normalizedHandle: normalizePlatformHandle(options.stats.handle),
        profileUrl: options.stats.profileUrl,
        status: PlatformStatus.ACTIVE,
        lastSyncedAt: now,
        nextSyncAt: new Date(now.getTime() + options.ttlSeconds * 1_000),
        lastErrorCode: null,
      },
    });
    if (claimed.count !== 1) {
      throw new ApiError(
        409,
        "SYNC_SUPERSEDED",
        "The platform handle changed while syncing. Start a new sync for the current handle.",
      );
    }
    return transaction.platformSnapshot.create({
      data: {
        identityId: options.identity.id,
        totalSolved: options.stats.totalSolved,
        easySolved: options.stats.easySolved,
        mediumSolved: options.stats.mediumSolved,
        hardSolved: options.stats.hardSolved,
        rating: options.stats.rating,
        ranking: options.stats.ranking,
        reputation: options.stats.reputation,
        raw: options.stats.raw,
      },
    });
  });
}
