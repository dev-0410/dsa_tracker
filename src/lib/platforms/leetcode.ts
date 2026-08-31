import "server-only";

import { Platform } from "@prisma/client";
import { z } from "zod";
import { fetchValidatedJson, UpstreamServiceError } from "@/lib/http";
import type { PlatformStats } from "./types";

const endpoint = new URL("https://leetcode.com/graphql");

const profileQuery = `
  query invariantUserProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        ranking
        reputation
      }
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
      tagProblemCounts {
        advanced {
          tagSlug
          problemsSolved
        }
        intermediate {
          tagSlug
          problemsSolved
        }
        fundamental {
          tagSlug
          problemsSolved
        }
      }
    }
  }
`;

const tagCountSchema = z.object({
  tagSlug: z.string(),
  problemsSolved: z.number().int().nonnegative(),
});

const responseSchema = z.object({
  data: z.object({
    matchedUser: z
      .object({
        username: z.string(),
        profile: z
          .object({
            ranking: z.number().int().nullable().optional(),
            reputation: z.number().int().nullable().optional(),
          })
          .nullable()
          .optional(),
        submitStatsGlobal: z
          .object({
            acSubmissionNum: z.array(
              z.object({
                difficulty: z.enum(["All", "Easy", "Medium", "Hard"]),
                count: z.number().int().nonnegative(),
              }),
            ),
          })
          .nullable(),
        tagProblemCounts: z
          .object({
            advanced: z.array(tagCountSchema),
            intermediate: z.array(tagCountSchema),
            fundamental: z.array(tagCountSchema),
          })
          .nullable()
          .optional(),
      })
      .nullable(),
  }),
  errors: z.array(z.object({ message: z.string() })).optional(),
});

const recentQuery = `
  query invariantRecentAc($username: String!, $limit: Int) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      titleSlug
      timestamp
    }
  }
`;

const recentSchema = z.object({
  data: z.object({
    recentAcSubmissionList: z
      .array(z.object({ titleSlug: z.string(), timestamp: z.string() }))
      .nullable(),
  }),
});

/**
 * Recently accepted submissions. LeetCode caps this at 20 regardless of the
 * requested limit, so it confirms recent solves rather than reconstructing a
 * full history.
 */
export async function fetchLeetCodeRecentSolves(
  handle: string,
): Promise<Array<{ problemKey: string; solvedAt: Date }>> {
  const response = await fetchValidatedJson(
    endpoint,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://leetcode.com",
        referer: "https://leetcode.com/",
      },
      body: JSON.stringify({
        query: recentQuery,
        operationName: "invariantRecentAc",
        variables: { username: handle, limit: 20 },
      }),
    },
    { schema: recentSchema },
  );

  return (response.data.recentAcSubmissionList ?? []).map((entry) => ({
    problemKey: entry.titleSlug,
    solvedAt: new Date(Number(entry.timestamp) * 1_000),
  }));
}

export async function fetchLeetCodeStats(handle: string): Promise<PlatformStats> {
  const response = await fetchValidatedJson(
    endpoint,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://leetcode.com",
        referer: "https://leetcode.com/",
      },
      body: JSON.stringify({
        query: profileQuery,
        variables: { username: handle },
        operationName: "invariantUserProfile",
      }),
    },
    { schema: responseSchema },
  );

  const user = response.data.matchedUser;
  if (!user?.submitStatsGlobal) {
    throw new UpstreamServiceError("NOT_FOUND", "That LeetCode profile was not found.", false);
  }

  const counts = Object.fromEntries(
    user.submitStatsGlobal.acSubmissionNum.map((entry) => [entry.difficulty, entry.count]),
  );
  const easySolved = counts.Easy ?? 0;
  const mediumSolved = counts.Medium ?? 0;
  const hardSolved = counts.Hard ?? 0;
  const totalSolved = counts.All ?? easySolved + mediumSolved + hardSolved;

  const tags = user.tagProblemCounts;
  const solvedByTag = [
    ...(tags?.fundamental ?? []),
    ...(tags?.intermediate ?? []),
    ...(tags?.advanced ?? []),
  ]
    .filter((tag) => tag.problemsSolved > 0)
    .map((tag) => ({ tagSlug: tag.tagSlug, solved: tag.problemsSolved }));

  return {
    platform: Platform.LEETCODE,
    handle: user.username,
    profileUrl: `https://leetcode.com/u/${encodeURIComponent(user.username)}/`,
    totalSolved,
    easySolved,
    mediumSolved,
    hardSolved,
    rating: null,
    ranking: user.profile?.ranking ?? null,
    reputation: user.profile?.reputation ?? null,
    solvedByTag,
    raw: {
      totalSolved,
      easySolved,
      mediumSolved,
      hardSolved,
      ranking: user.profile?.ranking ?? null,
      reputation: user.profile?.reputation ?? null,
      solvedByTag,
    },
  };
}
