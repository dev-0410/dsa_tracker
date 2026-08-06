import type {
  PartialRecommendationConfig,
  RecommendationConfig,
  RecommendationWeights,
} from './types';

export const DEFAULT_RECOMMENDATION_CONFIG: Readonly<RecommendationConfig> = Object.freeze({
  algorithmVersion: 'hybrid-v1',
  weights: Object.freeze({
    need: 0.24,
    goalFit: 0.18,
    reviewUrgency: 0.2,
    difficultyFit: 0.18,
    behavior: 0.08,
    quality: 0.07,
    exploration: 0.05,
  }),
  difficultyTargets: Object.freeze({
    DAILY: 0.65,
    LEARN: 0.65,
    REVIEW: 0.8,
    EXPLORE: 0.6,
    CHALLENGE: 0.45,
  }),
  difficultySigma: 0.18,
  irtDiscrimination: 1.7,
  defaultTargetMastery: 0.75,
  defaultGoalPriority: 0.5,
  minimumPrerequisiteMastery: 0.4,
  recentlyServedHours: 24,
  explorationGoalFloor: 0.25,
  explorationMinSolveProbability: 0.35,
  explorationMaxSolveProbability: 0.8,
  mmrRelevanceWeight: 0.85,
  similarityWeights: Object.freeze({
    topicOverlap: 0.7,
    primaryTopic: 0.2,
    difficulty: 0.1,
  }),
  maxPrimaryTopicPerFive: 2,
  maxBeginnerHardPerFive: 1,
  normalReviewShare: 0.35,
  backlogReviewShare: 0.5,
  backlogMultiple: 2,
  masteryLearningRate: 0.35,
  minimumMeaningfulAttemptMinutes: 5,
});

function sumWeights(weights: RecommendationWeights): number {
  return Object.values(weights).reduce((total, weight) => total + weight, 0);
}

export function resolveConfig(overrides?: PartialRecommendationConfig): RecommendationConfig {
  const config: RecommendationConfig = {
    ...DEFAULT_RECOMMENDATION_CONFIG,
    ...overrides,
    weights: {
      ...DEFAULT_RECOMMENDATION_CONFIG.weights,
      ...overrides?.weights,
    },
    difficultyTargets: {
      ...DEFAULT_RECOMMENDATION_CONFIG.difficultyTargets,
      ...overrides?.difficultyTargets,
    },
    similarityWeights: {
      ...DEFAULT_RECOMMENDATION_CONFIG.similarityWeights,
      ...overrides?.similarityWeights,
    },
  };

  const weightTotal = sumWeights(config.weights);
  if (!Number.isFinite(weightTotal) || Math.abs(weightTotal - 1) > 1e-9) {
    throw new Error(`Recommendation weights must sum to 1; received ${weightTotal}`);
  }

  if (config.mmrRelevanceWeight < 0 || config.mmrRelevanceWeight > 1) {
    throw new Error('mmrRelevanceWeight must be in [0, 1]');
  }

  if (config.difficultySigma <= 0 || config.irtDiscrimination <= 0) {
    throw new Error('Difficulty sigma and IRT discrimination must be positive');
  }

  return config;
}
