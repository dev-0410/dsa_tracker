import "server-only";

import { cache } from "react";
import { AttemptOutcome, PlatformStatus } from "@prisma/client";
import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "@/lib/db";

const publicHandlePattern = /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/;
const PUBLIC_PROFILE_CACHE_VERSION = "public-profile-v1";

function normalizePublicHandle(requestedHandle: string) {
  const handle = requestedHandle.trim().toLocaleLowerCase("en-US");
  return handle.length >= 3 && handle.length <= 30 && publicHandlePattern.test(handle)
    ? handle
    : null;
}

function publicProfileTag(handle: string) {
  return `${PUBLIC_PROFILE_CACHE_VERSION}:${handle}`;
}

/**
 * Returns an intentionally allowlisted public projection. Keep private user,
 * session, attempt-detail, recommendation, and study-plan fields out of this query.
 */
async function loadPublicProfile(handle: string) {
  const profile = await db.userProfile.findFirst({
    where: {
      handle,
      isPublic: true,
      onboardingCompletedAt: { not: null },
    },
    select: {
      userId: true,
      handle: true,
      displayName: true,
      bio: true,
      currentRole: true,
      targetRole: true,
      experienceLevel: true,
      learningGoal: true,
      preferredLanguage: true,
    },
  });
  if (!profile) return null;

  const [solvedProblems, outcomes, practiceTotals, mastery, platforms] = await Promise.all([
    db.userProblemState.count({ where: { userId: profile.userId, solveCount: { gt: 0 } } }),
    db.attempt.groupBy({
      by: ["outcome"],
      where: { userId: profile.userId },
      _count: { _all: true },
    }),
    db.dailyActivity.aggregate({
      where: { userId: profile.userId },
      _sum: { minutes: true },
    }),
    db.userTopicMastery.findMany({
      where: { userId: profile.userId },
      orderBy: [{ mastery: "desc" }, { topic: { sortOrder: "asc" } }],
      select: {
        mastery: true,
        attemptCount: true,
        topic: { select: { name: true, slug: true } },
      },
    }),
    db.platformIdentity.findMany({
      where: { userId: profile.userId, status: PlatformStatus.ACTIVE },
      orderBy: { platform: "asc" },
      select: {
        platform: true,
        handle: true,
        profileUrl: true,
        snapshots: {
          orderBy: { capturedAt: "desc" },
          take: 1,
          select: { totalSolved: true, rating: true, ranking: true },
        },
      },
    }),
  ]);

  const solvedAttempts = outcomes.find((row) => row.outcome === AttemptOutcome.SOLVED)?._count._all ?? 0;
  const meaningfulAttempts = outcomes
    .filter((row) => row.outcome !== AttemptOutcome.ABANDONED)
    .reduce((total, row) => total + row._count._all, 0);
  const totalAttempts = outcomes.reduce((total, row) => total + row._count._all, 0);
  const averageMastery = mastery.length
    ? mastery.reduce((total, topic) => total + topic.mastery, 0) / mastery.length
    : 0;

  return {
    profile: {
      handle: profile.handle,
      displayName: profile.displayName,
      bio: profile.bio,
      currentRole: profile.currentRole,
      targetRole: profile.targetRole,
      experienceLevel: profile.experienceLevel,
      learningGoal: profile.learningGoal,
      preferredLanguage: profile.preferredLanguage,
    },
    progress: {
      solvedProblems,
      totalAttempts,
      accuracy: meaningfulAttempts ? solvedAttempts / meaningfulAttempts : 0,
      averageMastery,
      practiceMinutes: practiceTotals._sum.minutes ?? 0,
    },
    mastery: mastery.map((topic) => ({
      name: topic.topic.name,
      slug: topic.topic.slug,
      mastery: topic.mastery,
      attempts: topic.attemptCount,
    })),
    platforms: platforms.map((identity) => ({
      platform: identity.platform,
      handle: identity.handle,
      profileUrl: identity.profileUrl,
      stats: identity.snapshots[0] ?? null,
    })),
  };
}

/**
 * React cache de-duplicates metadata/page reads in one render. The Next cache
 * absorbs repeat anonymous traffic across requests while keeping visibility
 * and progress mutations explicitly invalidatable.
 */
export const getPublicProfile = cache(async (requestedHandle: string) => {
  const handle = normalizePublicHandle(requestedHandle);
  if (!handle) return null;
  return unstable_cache(
    () => loadPublicProfile(handle),
    [PUBLIC_PROFILE_CACHE_VERSION, handle],
    { revalidate: 60, tags: [publicProfileTag(handle)] },
  )();
});

/** Call only after a successful mutation, from a request context. */
export function invalidatePublicProfileCache(...requestedHandles: Array<string | null | undefined>) {
  const handles = new Set(
    requestedHandles
      .map((value) => (value ? normalizePublicHandle(value) : null))
      .filter((value): value is string => value !== null),
  );
  for (const handle of handles) {
    revalidateTag(publicProfileTag(handle), { expire: 0 });
  }
}

export type PublicProfileData = NonNullable<Awaited<ReturnType<typeof getPublicProfile>>>;
