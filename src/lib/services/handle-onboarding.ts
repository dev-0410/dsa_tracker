import "server-only";

import { Platform, PlatformStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { UpstreamServiceError } from "@/lib/http";
import { fetchCodeforcesSolveHistory } from "@/lib/platforms/codeforces";
import { fetchLeetCodeRecentSolves } from "@/lib/platforms/leetcode";
import {
  fetchPlatformStats,
  normalizePlatformHandle,
  platformProfileUrl,
  type PlatformStats,
} from "@/lib/platforms";
import { seedMasteryFromPlatform } from "@/lib/services/external-mastery";

export type ConnectResult = {
  platform: Platform;
  handle: string;
  totalSolved: number;
  topicsSeeded: number;
  solvesRecorded: number;
  /** True when the platform exposes a complete solved history (Codeforces). */
  historyComplete: boolean;
};

/**
 * Connects one platform handle: verifies it exists, stores a snapshot, seeds
 * per-topic mastery, and records whichever solved problems the platform is
 * willing to reveal.
 *
 * LeetCode only exposes the 20 most recent accepted submissions, so its solved
 * set fills in over repeat syncs. Codeforces returns everything at once.
 */
export async function connectPlatformHandle(options: {
  userId: string;
  platform: Platform;
  handle: string;
}): Promise<ConnectResult> {
  const handle = options.handle.trim();
  if (!handle) {
    throw new UpstreamServiceError("NOT_FOUND", "Enter a handle to connect.", false);
  }

  // Fails fast with NOT_FOUND if the profile does not exist.
  const stats: PlatformStats = await fetchPlatformStats(options.platform, handle);

  const identity = await db.platformIdentity.upsert({
    where: { userId_platform: { userId: options.userId, platform: options.platform } },
    create: {
      userId: options.userId,
      platform: options.platform,
      handle: stats.handle,
      normalizedHandle: normalizePlatformHandle(stats.handle),
      profileUrl: stats.profileUrl || platformProfileUrl(options.platform, stats.handle),
      status: PlatformStatus.ACTIVE,
      lastSyncedAt: new Date(),
    },
    update: {
      handle: stats.handle,
      normalizedHandle: normalizePlatformHandle(stats.handle),
      profileUrl: stats.profileUrl || platformProfileUrl(options.platform, stats.handle),
      status: PlatformStatus.ACTIVE,
      lastSyncedAt: new Date(),
      lastErrorCode: null,
    },
  });

  await db.platformSnapshot.create({
    data: {
      identityId: identity.id,
      totalSolved: stats.totalSolved,
      easySolved: stats.easySolved,
      mediumSolved: stats.mediumSolved,
      hardSolved: stats.hardSolved,
      rating: stats.rating,
      ranking: stats.ranking,
      reputation: stats.reputation,
      raw: stats.raw,
    },
  });

  const topicsSeeded = await seedMasteryFromPlatform({
    userId: options.userId,
    platform: options.platform,
    stats,
  });

  const solvesRecorded = await recordExternalSolves({
    userId: options.userId,
    platform: options.platform,
    handle: stats.handle,
  });

  return {
    platform: options.platform,
    handle: stats.handle,
    totalSolved: stats.totalSolved,
    topicsSeeded,
    solvesRecorded,
    historyComplete: options.platform === Platform.CODEFORCES,
  };
}

/**
 * Records solved problems from the platform into ExternalSolve, ignoring any
 * already present. Returns how many new rows were written.
 */
export async function recordExternalSolves(options: {
  userId: string;
  platform: Platform;
  handle: string;
}): Promise<number> {
  const solves =
    options.platform === Platform.LEETCODE
      ? await fetchLeetCodeRecentSolves(options.handle)
      : (await fetchCodeforcesSolveHistory(options.handle)).solves;

  if (solves.length === 0) return 0;

  const written = await db.externalSolve.createMany({
    data: solves.map((solve) => ({
      userId: options.userId,
      platform: options.platform,
      problemKey: solve.problemKey,
      solvedAt: solve.solvedAt ?? null,
      source: options.platform === Platform.LEETCODE ? "RECENT_SUBMISSIONS" : "FULL_HISTORY",
    })),
    skipDuplicates: true,
  });

  return written.count;
}

/** Problem keys the user has solved externally, for dedup and verification. */
export async function externalSolveKeys(options: {
  userId: string;
  platform?: Platform;
}): Promise<Set<string>> {
  const rows = await db.externalSolve.findMany({
    where: { userId: options.userId, ...(options.platform ? { platform: options.platform } : {}) },
    select: { problemKey: true },
  });
  return new Set(rows.map((row) => row.problemKey));
}

/**
 * Step 6: re-checks the platform to confirm a recommended problem was solved.
 *
 * Returns true when the problem now appears in the user's accepted submissions.
 * Because this refreshes the stored solve set as a side effect, repeat calls
 * also gradually fill in LeetCode's history.
 */
export async function verifySolvedOnPlatform(options: {
  userId: string;
  platform: Platform;
  handle: string;
  problemKey: string;
}): Promise<boolean> {
  await recordExternalSolves({
    userId: options.userId,
    platform: options.platform,
    handle: options.handle,
  });

  const existing = await db.externalSolve.findUnique({
    where: {
      userId_platform_problemKey: {
        userId: options.userId,
        platform: options.platform,
        problemKey: options.problemKey,
      },
    },
    select: { id: true },
  });

  return existing !== null;
}
