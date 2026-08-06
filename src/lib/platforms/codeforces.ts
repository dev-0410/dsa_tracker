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
        }),
      }),
    )
    .optional(),
});

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

  const accepted = new Set(
    (submissions.result ?? [])
      .filter((submission) => submission.verdict === "OK")
      .map((submission) => `${submission.problem.contestId ?? "gym"}-${submission.problem.index}`),
  );

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
    raw: {
      totalSolved: accepted.size,
      rating: profile.rating ?? null,
      maxRating: profile.maxRating ?? null,
      rank: profile.rank ?? null,
    },
  };
}
