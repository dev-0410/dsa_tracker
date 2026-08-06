import { HOUR_MS, defaultTheta, masteryFromTheta, normalizeTopicWeights, toEpoch } from './math';
import { isDueReview } from './scoring';
import type {
  CandidateExclusion,
  ExclusionCode,
  RecommendationConfig,
  RecommendationContext,
  RecommendationProblem,
  TopicMasteryState,
  UserProblemState,
} from './types';

export interface EligibleCandidate {
  problem: RecommendationProblem;
  state?: UserProblemState;
}

export interface CandidateFilterResult {
  eligible: EligibleCandidate[];
  exclusions: CandidateExclusion[];
}

function hasValidMetadata(problem: RecommendationProblem): boolean {
  return (
    problem.id.trim().length > 0 &&
    problem.title.trim().length > 0 &&
    ['EASY', 'MEDIUM', 'HARD'].includes(problem.difficulty) &&
    Number.isFinite(problem.difficultyB) &&
    Number.isFinite(problem.estimatedMinutes) &&
    problem.estimatedMinutes > 0 &&
    Number.isFinite(problem.qualityScore) &&
    normalizeTopicWeights(problem.topics).length > 0
  );
}

export function filterCandidates(options: {
  candidates: RecommendationProblem[];
  problemStates: UserProblemState[];
  topicMastery: TopicMasteryState[];
  context: RecommendationContext;
  config: RecommendationConfig;
}): CandidateFilterResult {
  const now = toEpoch(options.context.now);
  if (now === null) throw new Error('Recommendation context contains an invalid current time');

  const stateByProblem = new Map(options.problemStates.map((state) => [state.problemId, state]));
  const masteryByTopic = new Map(options.topicMastery.map((state) => [state.topicId, state]));
  const priorTheta = defaultTheta(options.context.experienceLevel);
  const seenIds = new Set<string>();
  const eligible: EligibleCandidate[] = [];
  const exclusions: CandidateExclusion[] = [];

  for (const problem of options.candidates) {
    const codes: ExclusionCode[] = [];
    const state = stateByProblem.get(problem.id);
    const dueReview = isDueReview(state, now);

    if (seenIds.has(problem.id)) codes.push('DUPLICATE_ID');
    seenIds.add(problem.id);

    if (!hasValidMetadata(problem)) codes.push('INVALID_METADATA');
    if (!problem.isActive) codes.push('INACTIVE');
    if (problem.isPremium && !options.context.includePremium) codes.push('PREMIUM_LOCKED');

    const dismissedUntil = toEpoch(state?.dismissedUntil);
    if (dismissedUntil !== null && dismissedUntil > now) codes.push('DISMISSED');

    const lastServedAt = toEpoch(state?.lastServedAt);
    if (
      !dueReview &&
      lastServedAt !== null &&
      now - lastServedAt >= 0 &&
      now - lastServedAt < options.config.recentlyServedHours * HOUR_MS
    ) {
      codes.push('RECENTLY_SERVED');
    }

    if (state?.solved && !dueReview) codes.push('SOLVED_NOT_DUE');

    const unmetPrerequisite = (problem.prerequisiteTopicIds ?? [])
      .filter((topicId) => topicId.length > 0)
      .some((topicId) => {
        const theta = masteryByTopic.get(topicId)?.theta ?? priorTheta;
        return masteryFromTheta(theta) < options.config.minimumPrerequisiteMastery;
      });
    if (unmetPrerequisite) codes.push('UNMET_PREREQUISITE');

    if (options.context.mode === 'REVIEW' && !dueReview) codes.push('MODE_MISMATCH');
    if (
      options.context.mode !== 'DAILY' &&
      options.context.mode !== 'REVIEW' &&
      dueReview
    ) {
      codes.push('MODE_MISMATCH');
    }

    if (codes.length > 0) {
      exclusions.push({ problemId: problem.id, codes: [...new Set(codes)] });
    } else {
      eligible.push({ problem, state });
    }
  }

  return { eligible, exclusions };
}
