import type { ProductDifficulty, ProductPlatform, RecommendationLane } from "./types";

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export const difficultyLabel: Record<ProductDifficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

export const difficultyClasses: Record<ProductDifficulty, string> = {
  EASY: "border-success/30 bg-success/10 text-success",
  MEDIUM: "border-warning/30 bg-warning/10 text-warning",
  HARD: "border-danger/30 bg-danger/10 text-danger",
};

export const laneLabel: Record<RecommendationLane, string> = {
  LEARN: "Learn",
  REVIEW: "Review",
  EXPLORE: "Explore",
  CHALLENGE: "Challenge",
};

export const laneClasses: Record<RecommendationLane, string> = {
  LEARN: "border-action/25 bg-action/10 text-action",
  REVIEW: "border-highlight/60 bg-highlight/25 text-[#4A6314] dark:text-highlight",
  EXPLORE: "border-line bg-subtle text-muted",
  CHALLENGE: "border-danger/30 bg-danger/10 text-danger",
};

export const platformLabel: Record<ProductPlatform, string> = {
  LEETCODE: "LeetCode",
  CODEFORCES: "Codeforces",
};
