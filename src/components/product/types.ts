export type ProductDifficulty = "EASY" | "MEDIUM" | "HARD";
export type ProductPlatform = "LEETCODE" | "CODEFORCES";
export type RecommendationLane = "LEARN" | "REVIEW" | "EXPLORE" | "CHALLENGE";
export type AttemptOutcome = "SOLVED" | "PARTIAL" | "FAILED" | "ABANDONED";
export type PreferredLanguage = "CPP" | "JAVA" | "PYTHON" | "JAVASCRIPT" | "TYPESCRIPT" | "GO" | "RUST";

export interface ProblemSummary {
  id: string;
  title: string;
  url: string;
  platform: ProductPlatform;
  difficulty: ProductDifficulty;
  estimatedMinutes: number;
  topics: string[];
  pattern?: string | null;
  isPremium?: boolean;
}

export interface RecommendationReason {
  label: string;
  detail: string;
  contribution?: number;
}

export interface RecommendationViewModel {
  id: string;
  rank: number;
  lane: RecommendationLane;
  matchPercent: number;
  predictedSolvePercent?: number | null;
  problem: ProblemSummary;
  reasons: RecommendationReason[];
  recommendationItemId?: string | null;
  detailHref?: string | null;
}

export interface ActivityDay {
  date: string;
  count: number;
  solved?: number;
  minutes?: number;
  level?: 0 | 1 | 2 | 3 | 4;
}
