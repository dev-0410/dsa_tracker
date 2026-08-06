import { resolveConfig } from './config';
import { clamp, defaultTheta, masteryFromTheta, normalizeTopicWeights } from './math';
import { predictedSolveProbability } from './scoring';
import type {
  ExperienceLevel,
  MasteryAttempt,
  MasteryUpdateResult,
  PartialRecommendationConfig,
  RecommendationProblem,
  TopicMasteryState,
} from './types';

export type ReviewRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

export interface MasteryUpdateInput {
  problem: RecommendationProblem;
  currentMastery: TopicMasteryState[];
  attempt: MasteryAttempt;
  experienceLevel: ExperienceLevel;
  config?: PartialRecommendationConfig;
}

export function effectiveAttemptOutcome(
  problem: RecommendationProblem,
  attempt: MasteryAttempt,
): number {
  if (attempt.outcome === 'FAILED') return 0;
  if (attempt.outcome === 'ABANDONED') return 0.15;
  if (attempt.outcome === 'PARTIAL') return 0.35;

  const hints = Math.min(3, Math.max(0, attempt.hintsUsed ?? 0));
  const duration = Math.max(0, attempt.durationMinutes ?? problem.estimatedMinutes);
  const excessRatio =
    problem.estimatedMinutes > 0
      ? clamp(duration / problem.estimatedMinutes - 1, 0, 2)
      : 0;

  return clamp(1 - 0.1 * hints - 0.15 * excessRatio, 0.55, 1);
}

export function mapAttemptToReviewRating(
  problem: RecommendationProblem,
  attempt: MasteryAttempt,
): ReviewRating {
  if (attempt.outcome === 'PARTIAL') return 'HARD';
  if (attempt.outcome !== 'SOLVED') return 'AGAIN';

  const hints = Math.max(0, attempt.hintsUsed ?? 0);
  const duration = Math.max(0, attempt.durationMinutes ?? problem.estimatedMinutes);
  const timeRatio = problem.estimatedMinutes > 0 ? duration / problem.estimatedMinutes : 1;

  if (hints > 0 || timeRatio > 1.5) return 'HARD';
  if (timeRatio <= 0.6 && (attempt.confidence ?? 0) >= 4) return 'EASY';
  return 'GOOD';
}

function shouldUpdateMastery(input: MasteryUpdateInput, minimumMinutes: number): boolean {
  if (input.attempt.meaningful === false) return false;
  if (input.attempt.meaningful === true) return true;
  if (input.attempt.outcome !== 'ABANDONED') return true;

  return (
    input.attempt.durationMinutes === null ||
    input.attempt.durationMinutes === undefined ||
    input.attempt.durationMinutes >= minimumMinutes
  );
}

export function updateTopicMastery(input: MasteryUpdateInput): MasteryUpdateResult {
  const config = resolveConfig(input.config);
  const solveProbability = predictedSolveProbability(
    input.problem,
    input.currentMastery,
    input.experienceLevel,
    config,
  );
  const effectiveOutcome = effectiveAttemptOutcome(input.problem, input.attempt);
  const topics = normalizeTopicWeights(input.problem.topics);
  const currentByTopic = new Map(
    input.currentMastery.map((mastery) => [mastery.topicId, mastery]),
  );
  const priorTheta = defaultTheta(input.experienceLevel);
  const update = shouldUpdateMastery(input, config.minimumMeaningfulAttemptMinutes);

  const deltas = topics.map((topic) => {
    const current = currentByTopic.get(topic.topicId);
    const beforeTheta = clamp(current?.theta ?? priorTheta, -3, 3);
    const previousAttempts = Math.max(0, Math.floor(current?.attemptCount ?? 0));
    const learningRate =
      config.masteryLearningRate / Math.sqrt(1 + previousAttempts / 20);
    const rawDelta = update
      ? learningRate * topic.weight * (effectiveOutcome - solveProbability)
      : 0;
    const afterTheta = clamp(beforeTheta + rawDelta, -3, 3);
    const attemptCount = previousAttempts + (update ? 1 : 0);
    const previousSuccesses = Math.max(0, current?.effectiveSuccesses ?? 0);

    return {
      topicId: topic.topicId,
      beforeTheta,
      afterTheta,
      beforeMastery: masteryFromTheta(beforeTheta),
      afterMastery: masteryFromTheta(afterTheta),
      delta: afterTheta - beforeTheta,
      attemptCount,
      effectiveSuccesses:
        previousSuccesses + (update ? effectiveOutcome * topic.weight : 0),
      uncertainty: 1 / Math.sqrt(1 + attemptCount),
    };
  });

  return {
    updated: update && topics.length > 0,
    effectiveOutcome,
    predictedSolveProbability: solveProbability,
    topics: deltas,
  };
}
