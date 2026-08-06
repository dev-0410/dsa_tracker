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
    }
  }
`;

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
      })
      .nullable(),
  }),
  errors: z.array(z.object({ message: z.string() })).optional(),
});

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
    raw: {
      totalSolved,
      easySolved,
      mediumSolved,
      hardSolved,
      ranking: user.profile?.ranking ?? null,
      reputation: user.profile?.reputation ?? null,
    },
  };
}
