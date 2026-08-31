import "server-only";

import { z } from "zod";
import { fetchValidatedJson, UpstreamServiceError } from "@/lib/http";
import { mapPlatformTag } from "./topic-mapping";

const endpoint = new URL("https://leetcode.com/graphql");

const listQuery = `
  query invariantProblemsetList($limit: Int, $skip: Int, $filters: QuestionFilterInput) {
    problemsetQuestionListV2(limit: $limit, skip: $skip, filters: $filters) {
      totalLength
      questions {
        questionFrontendId
        titleSlug
        title
        difficulty
        acRate
        paidOnly
        topicTags {
          slug
        }
      }
    }
  }
`;

const questionSchema = z.object({
  questionFrontendId: z.string(),
  titleSlug: z.string(),
  title: z.string(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  acRate: z.number().nullable().optional(),
  paidOnly: z.boolean().nullable().optional(),
  topicTags: z.array(z.object({ slug: z.string() })).nullable().optional(),
});

const listSchema = z.object({
  data: z.object({
    problemsetQuestionListV2: z
      .object({
        totalLength: z.number().int().nonnegative(),
        questions: z.array(questionSchema),
      })
      .nullable(),
  }),
  errors: z.array(z.object({ message: z.string() })).optional(),
});

export type LeetCodeCatalogProblem = {
  externalId: string;
  slug: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  /** IRT difficulty in [-3, 3], derived from the observed acceptance rate. */
  difficultyB: number;
  estimatedMinutes: number;
  qualityScore: number;
  isPremium: boolean;
  topicSlugs: string[];
};

/**
 * Turns an observed acceptance rate into an IRT difficulty.
 *
 * Acceptance rate is a population-level solve probability, which is exactly
 * what IRT's difficulty parameter describes, so inverting the logistic recovers
 * b on the right scale. Hand-authored difficulty values were guesses; this is
 * measured from how ~4k problems actually behave.
 *
 * The tier offset keeps ordering sane where acRate is misleading — a HARD
 * problem with a high acceptance rate is usually attempted only by strong
 * users, so it should not read as easy.
 */
export function difficultyBFromAcRate(
  acRate: number | null | undefined,
  difficulty: "EASY" | "MEDIUM" | "HARD",
): number {
  const tierAnchor = difficulty === "EASY" ? -1.3 : difficulty === "MEDIUM" ? 0.1 : 1.3;
  if (acRate === null || acRate === undefined || !Number.isFinite(acRate)) {
    return tierAnchor;
  }

  // acRate arrives as a fraction (0.58) or a percentage (58) depending on field.
  const rate = acRate > 1 ? acRate / 100 : acRate;
  const clamped = Math.min(0.95, Math.max(0.05, rate));
  // Invert P = sigmoid(-b) with discrimination 1.7 -> b = -logit(P) / 1.7.
  const logit = Math.log(clamped / (1 - clamped));
  const fromRate = -logit / 1.7;

  // Blend toward the tier anchor so neither signal dominates.
  const blended = 0.6 * fromRate + 0.4 * tierAnchor;
  return Math.min(3, Math.max(-3, Number(blended.toFixed(3))));
}

/** Rough time budget; interviews use ~20/35/55 minutes by tier. */
export function estimatedMinutesFor(difficulty: "EASY" | "MEDIUM" | "HARD"): number {
  return difficulty === "EASY" ? 20 : difficulty === "MEDIUM" ? 35 : 55;
}

/**
 * Quality proxy. Without editorial ratings, a problem's acceptance rate sitting
 * in a healthy band is the best available signal that it is well-posed: extreme
 * rates in either direction correlate with trick questions and bad test cases.
 */
export function qualityScoreFromAcRate(acRate: number | null | undefined): number {
  if (acRate === null || acRate === undefined || !Number.isFinite(acRate)) return 0.7;
  const rate = acRate > 1 ? acRate / 100 : acRate;
  const distanceFromIdeal = Math.abs(rate - 0.45);
  return Number(Math.min(0.98, Math.max(0.55, 0.95 - distanceFromIdeal)).toFixed(3));
}

export function toCatalogProblem(
  question: z.infer<typeof questionSchema>,
): LeetCodeCatalogProblem | null {
  const topicSlugs = [
    ...new Set(
      (question.topicTags ?? [])
        .map((tag) => mapPlatformTag("LEETCODE", tag.slug))
        .filter((slug): slug is string => slug !== null),
    ),
  ];
  // A problem with no mappable topic cannot be scored or diversified, so it is
  // skipped rather than imported with an empty topic set.
  if (topicSlugs.length === 0) return null;

  return {
    externalId: question.questionFrontendId,
    slug: question.titleSlug,
    title: question.title,
    difficulty: question.difficulty,
    difficultyB: difficultyBFromAcRate(question.acRate, question.difficulty),
    estimatedMinutes: estimatedMinutesFor(question.difficulty),
    qualityScore: qualityScoreFromAcRate(question.acRate),
    isPremium: Boolean(question.paidOnly),
    topicSlugs,
  };
}

/** Fetches one page of the public problemset. */
export async function fetchLeetCodeCatalogPage(options: {
  limit: number;
  skip: number;
}): Promise<{ totalLength: number; problems: LeetCodeCatalogProblem[]; rawCount: number }> {
  const response = await fetchValidatedJson(
    endpoint,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://leetcode.com",
        referer: "https://leetcode.com/problemset/",
      },
      body: JSON.stringify({
        query: listQuery,
        operationName: "invariantProblemsetList",
        variables: {
          limit: options.limit,
          skip: options.skip,
          filters: { filterCombineType: "ALL" },
        },
      }),
    },
    { schema: listSchema, timeoutMs: 20_000, maxBytes: 10_000_000 },
  );

  const page = response.data.problemsetQuestionListV2;
  if (!page) {
    throw new UpstreamServiceError("BAD_RESPONSE", "LeetCode returned no problemset page.");
  }

  return {
    totalLength: page.totalLength,
    rawCount: page.questions.length,
    problems: page.questions
      .map(toCatalogProblem)
      .filter((problem): problem is LeetCodeCatalogProblem => problem !== null),
  };
}
