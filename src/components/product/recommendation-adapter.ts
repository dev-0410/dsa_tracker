import type { PresentedRecommendation } from "@/lib/services/recommendations";
import type { RecommendationViewModel } from "./types";

const reasonNames: Record<string, string> = {
  REVIEW_DUE: "Review timing",
  MASTERY_GAP: "Skill gap",
  GOAL_ALIGNED: "Goal fit",
  DIFFICULTY_MATCH: "Challenge fit",
  BEHAVIOR_AFFINITY: "Practice signal",
  HIGH_QUALITY: "Catalog quality",
  EXPLORE_UNCERTAINTY: "Calibration",
};

export function toRecommendationViewModel(item: PresentedRecommendation): RecommendationViewModel {
  return {
    id: item.recommendationItemId,
    recommendationItemId: item.recommendationItemId,
    rank: item.rank,
    lane: item.lane,
    matchPercent: item.matchPercent,
    predictedSolvePercent: Math.round(item.predictedSolveProbability * 100),
    problem: {
      id: item.problem.id,
      title: item.problem.title,
      url: item.problem.url,
      platform: item.problem.platform,
      difficulty: item.problem.difficulty,
      estimatedMinutes: item.problem.estimatedMinutes,
      topics: item.problem.topics.map((topic) => topic.name),
      pattern: item.problem.pattern,
    },
    reasons: item.explanation.reasons.map((reason) => ({
      label: reasonNames[reason.code] ?? "Recommendation signal",
      detail: reason.label,
      contribution:
        typeof reason.contribution === "number" ? Math.round(reason.contribution * 1_000) / 10 : undefined,
    })),
  };
}
