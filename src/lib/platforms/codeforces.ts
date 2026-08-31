import "server-only";

import { Platform } from "@prisma/client";
import { z } from "zod";
import { fetchValidatedJson, UpstreamServiceError } from "@/lib/http";
import type { PlatformStats } from "./types";

const userInfoSchema = z.object({
  status: z.enum(["OK", "FAILED"]),
  result: z
    .array(
      z.object({
        handle: z.string(),
        rating: z.number().int().optional(),
        rank: z.string().optional(),
        maxRating: z.number().int().optional(),
      }),
    )
    .optional(),
  comment: z.string().optional(),
});

const submissionsSchema = z.object({
  status: z.enum(["OK", "FAILED"]),
  result: z
    .array(
      z.object({
        verdict: z.string().optional(),
        problem: z.object({
          contestId: z.number().int().optional(),
          index: z.string(),
          rating: z.number().int().optional(),
          tags: z.array(z.string()).optional(),
        }),
      }),
    )
    .optional(),
});

const solveHistorySchema = z.object({
  status: z.enum(["OK", "FAILED"]),
  result: z
    .array(
      z.object({
        verdict: z.string().optional(),
        creationTimeSeconds: z.number().int().optional(),
        problem: z.object({
          contestId: z.number().int().optional(),
          index: z.string(),
          tags: z.array(z.string()).optional(),
        }),
      }),
    )
    .optional(),
});

/**
 * Full accepted-submission history. Unlike LeetCode, Codeforces returns every
 * submission, so this is a complete solved set and also yields per-topic counts.
 */
export async function fetchCodeforcesSolveHistory(handle: string): Promise<{
  solves: Array<{ problemKey: string; solvedAt: Date | null }>;
  solvedByTag: Array<{ tagSlug: string; solved: number }>;
}> {
  const url = new URL("https://codeforces.com/api/user.status");
  url.searchParams.set("handle", handle);
  url.searchParams.set("from", "1");
  url.searchParams.set("count", "10000");

  const response = await fetchValidatedJson(url, {}, {
    schema: solveHistorySchema,
    timeoutMs: 15_000,
    maxBytes: 10_000_000,
  });
  if (response.status !== "OK") {
    throw new UpstreamServiceError("BAD_RESPONSE", "Codeforces did not return submission history.");
  }

  const firstSolvedAt = new Map<string, Date | null>();
  const tagCounts = new Map<string, Set<string>>();

  for (const submission of response.result ?? []) {
    if (submission.verdict !== "OK") continue;
    const key = `${submission.problem.contestId ?? "gym"}-${submission.problem.index}`;
    const solvedAt = submission.creationTimeSeconds
      ? new Date(submission.creationTimeSeconds * 1_000)
      : null;

    const existing = firstSolvedAt.get(key);
    if (existing === undefined || (solvedAt && existing && solvedAt < existing)) {
      firstSolvedAt.set(key, solvedAt);
    }
    // Count each solved problem once per tag.
    for (const tag of submission.problem.tags ?? []) {
      const bucket = tagCounts.get(tag) ?? new Set<string>();
      bucket.add(key);
      tagCounts.set(tag, bucket);
    }
  }

  return {
    solves: [...firstSolvedAt.entries()].map(([problemKey, solvedAt]) => ({ problemKey, solvedAt })),
    solvedByTag: [...tagCounts.entries()].map(([tagSlug, keys]) => ({
      tagSlug,
      solved: keys.size,
    })),
  };
}

export async function fetchCodeforcesStats(handle: string): Promise<PlatformStats> {
  const infoUrl = new URL("https://codeforces.com/api/user.info");
  infoUrl.searchParams.set("handles", handle);
  infoUrl.searchParams.set("checkHistoricHandles", "false");

  const info = await fetchValidatedJson(infoUrl, {}, { schema: userInfoSchema });
  const profile = info.result?.[0];
  if (info.status !== "OK" || !profile) {
    throw new UpstreamServiceError("NOT_FOUND", "That Codeforces profile was not found.", false);
  }

  const submissionsUrl = new URL("https://codeforces.com/api/user.status");
  submissionsUrl.searchParams.set("handle", profile.handle);
  submissionsUrl.searchParams.set("from", "1");
  submissionsUrl.searchParams.set("count", "10000");
  const submissions = await fetchValidatedJson(submissionsUrl, {}, {
    schema: submissionsSchema,
    timeoutMs: 10_000,
    maxBytes: 5_000_000,
  });

  if (submissions.status !== "OK") {
    throw new UpstreamServiceError("BAD_RESPONSE", "Codeforces did not return submission history.");
  }

  const acceptedSubmissions = (submissions.result ?? []).filter(
    (submission) => submission.verdict === "OK",
  );
  const accepted = new Set(
    acceptedSubmissions.map(
      (submission) => `${submission.problem.contestId ?? "gym"}-${submission.problem.index}`,
    ),
  );

  // Per-topic counts, so Codeforces can seed mastery the same way LeetCode does.
  const tagBuckets = new Map<string, Set<string>>();
  for (const submission of acceptedSubmissions) {
    const key = `${submission.problem.contestId ?? "gym"}-${submission.problem.index}`;
    for (const tag of submission.problem.tags ?? []) {
      const bucket = tagBuckets.get(tag) ?? new Set<string>();
      bucket.add(key);
      tagBuckets.set(tag, bucket);
    }
  }

  const solvedByTag = [...tagBuckets.entries()].map(([tagSlug, keys]) => ({
    tagSlug,
    solved: keys.size,
  }));

  return {
    platform: Platform.CODEFORCES,
    handle: profile.handle,
    profileUrl: `https://codeforces.com/profile/${encodeURIComponent(profile.handle)}`,
    totalSolved: accepted.size,
    easySolved: null,
    mediumSolved: null,
    hardSolved: null,
    rating: profile.rating ?? null,
    ranking: null,
    reputation: null,
    solvedByTag,
    raw: {
      totalSolved: accepted.size,
      rating: profile.rating ?? null,
      maxRating: profile.maxRating ?? null,
      rank: profile.rank ?? null,
      solvedByTag,
    },
  };
}
