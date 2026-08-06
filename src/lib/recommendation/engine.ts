import { resolveConfig } from './config';
import { selectWithMmr, type MmrSelection } from './diversity';
import { filterCandidates, type EligibleCandidate } from './filters';
import { toEpoch } from './math';
import { scoreCandidate } from './scoring';
import type {
  CandidateScore,
  RankedRecommendation,
  RecommendationInput,
  RecommendationLane,
  RecommendationQuotas,
  RecommendationResult,
} from './types';

interface SelectedCandidate extends MmrSelection {
  lane: RecommendationLane;
}

function calculateDailyReviewQuota(
  limit: number,
  dueCount: number,
  config: ReturnType<typeof resolveConfig>,
): number {
  if (dueCount <= 0 || limit <= 0) return 0;
  const share =
    dueCount > limit * config.backlogMultiple
      ? config.backlogReviewShare
      : config.normalReviewShare;
  return Math.min(dueCount, Math.max(1, Math.ceil(limit * share)));
}

function countQuotas(items: SelectedCandidate[]): RecommendationQuotas {
  return items.reduce<RecommendationQuotas>(
    (quotas, item) => {
      if (item.lane === 'REVIEW') quotas.review += 1;
      if (item.lane === 'LEARN') quotas.learn += 1;
      if (item.lane === 'EXPLORE') quotas.explore += 1;
      if (item.lane === 'CHALLENGE') quotas.challenge += 1;
      return quotas;
    },
    { review: 0, learn: 0, explore: 0, challenge: 0 },
  );
}

function select(options: {
  candidates: CandidateScore[];
  count: number;
  lane: RecommendationLane;
  input: RecommendationInput;
  config: ReturnType<typeof resolveConfig>;
  alreadySelected: SelectedCandidate[];
  relevanceScore?: (candidate: CandidateScore) => number;
}): SelectedCandidate[] {
  const alreadySelectedScores = options.alreadySelected.map((item) => item.candidate);
  return selectWithMmr(options.candidates, options.count, {
    config: options.config,
    seed: options.input.context.seed,
    experienceLevel: options.input.context.experienceLevel,
    mode: options.input.context.mode,
    slateLimit: Math.max(1, Math.floor(options.input.context.limit)),
    selected: alreadySelectedScores,
    relevanceScore: options.relevanceScore,
  }).map((selection) => ({ ...selection, lane: options.lane }));
}

function scoreEligible(
  candidate: EligibleCandidate,
  input: RecommendationInput,
  config: ReturnType<typeof resolveConfig>,
  modeOverride?: 'LEARN' | 'REVIEW' | 'EXPLORE' | 'CHALLENGE',
): CandidateScore {
  return scoreCandidate(candidate.problem, {
    topicMastery: input.topicMastery,
    topicGoals: input.topicGoals,
    topicBehavior: input.topicBehavior ?? [],
    problemState: candidate.state,
    context: input.context,
    config,
    modeOverride,
  });
}

function removeSelected(candidates: CandidateScore[], selected: SelectedCandidate[]): CandidateScore[] {
  const selectedIds = new Set(selected.map((item) => item.candidate.problem.id));
  return candidates.filter((candidate) => !selectedIds.has(candidate.problem.id));
}

function ensureExplorationReason(candidate: CandidateScore): CandidateScore {
  if (candidate.reasons.some((reason) => reason.code === 'EXPLORE_UNCERTAINTY')) {
    return candidate;
  }

  const explorationReason = {
    code: 'EXPLORE_UNCERTAINTY' as const,
    label: 'Builds evidence in an under-explored topic',
    component: 'exploration' as const,
    value: candidate.components.exploration,
    contribution: candidate.contributions.exploration,
  };
  return {
    ...candidate,
    reasons: [...candidate.reasons.slice(0, 2), explorationReason],
  };
}

function fillRemaining(options: {
  selected: SelectedCandidate[];
  scores: CandidateScore[];
  limit: number;
  input: RecommendationInput;
  config: ReturnType<typeof resolveConfig>;
}): void {
  const missing = options.limit - options.selected.length;
  if (missing <= 0) return;

  const remaining = removeSelected(options.scores, options.selected);
  const additions = select({
    candidates: remaining,
    count: missing,
    lane: options.input.context.mode === 'CHALLENGE' ? 'CHALLENGE' : 'LEARN',
    input: options.input,
    config: options.config,
    alreadySelected: options.selected,
  });

  for (const addition of additions) {
    addition.lane = addition.candidate.dueReview
      ? 'REVIEW'
      : options.input.context.mode === 'CHALLENGE'
        ? 'CHALLENGE'
        : 'LEARN';
    options.selected.push(addition);
  }
}

export function generateRecommendations(input: RecommendationInput): RecommendationResult {
  const config = resolveConfig(input.config);
  const now = toEpoch(input.context.now);
  if (now === null) throw new Error('Recommendation context contains an invalid current time');
  const limit = Math.max(0, Math.floor(input.context.limit));

  const filtered = filterCandidates({
    candidates: input.candidates,
    problemStates: input.problemStates ?? [],
    topicMastery: input.topicMastery,
    context: input.context,
    config,
  });
  const scored = filtered.eligible.map((candidate) =>
    scoreEligible(candidate, input, config),
  );
  const dueScores = scored.filter((candidate) => candidate.dueReview);
  const nonDueScores = scored.filter((candidate) => !candidate.dueReview);
  const selected: SelectedCandidate[] = [];

  if (limit > 0 && input.context.mode === 'DAILY') {
    const reviewQuota = calculateDailyReviewQuota(limit, dueScores.length, config);
    selected.push(
      ...select({
        candidates: dueScores,
        count: reviewQuota,
        lane: 'REVIEW',
        input,
        config,
        alreadySelected: selected,
      }),
    );

    const exploreQuota = limit >= 6 && nonDueScores.length > 0 ? 1 : 0;
    const exploreScores = filtered.eligible
      .filter((candidate) => !dueScores.some((score) => score.problem.id === candidate.problem.id))
      .map((candidate) => scoreEligible(candidate, input, config, 'EXPLORE'))
      .filter(
        (candidate) =>
          candidate.topicGoalFit >= config.explorationGoalFloor &&
          candidate.predictedSolveProbability >= config.explorationMinSolveProbability &&
          candidate.predictedSolveProbability <= config.explorationMaxSolveProbability,
      );
    const reservedExploration = select({
      candidates: exploreScores,
      count: exploreQuota,
      lane: 'EXPLORE',
      input,
      config,
      alreadySelected: selected,
      relevanceScore: (candidate) =>
        0.55 * candidate.baseScore + 0.45 * candidate.components.exploration,
    }).map((item) => ({ ...item, candidate: ensureExplorationReason(item.candidate) }));

    const learnCount = Math.max(0, limit - selected.length - reservedExploration.length);
    const learnSelectionContext = [...selected, ...reservedExploration];
    const learnSelections = select({
      candidates: removeSelected(nonDueScores, reservedExploration),
      count: learnCount,
      lane: 'LEARN',
      input,
      config,
      alreadySelected: learnSelectionContext,
    });
    selected.push(...learnSelections, ...reservedExploration);

    // If a lane is sparse, redistribute its slots rather than returning a
    // mysteriously short daily slate.
    fillRemaining({ selected, scores: scored, limit, input, config });
  } else if (limit > 0) {
    const lane: RecommendationLane =
      input.context.mode === 'REVIEW'
        ? 'REVIEW'
        : input.context.mode === 'EXPLORE'
          ? 'EXPLORE'
          : input.context.mode === 'CHALLENGE'
            ? 'CHALLENGE'
            : 'LEARN';
    let modeScores = filtered.eligible.map((candidate) =>
      scoreEligible(candidate, input, config, input.context.mode === 'DAILY' ? undefined : input.context.mode),
    );

    if (input.context.mode === 'EXPLORE') {
      modeScores = modeScores
        .filter(
          (candidate) =>
            candidate.topicGoalFit >= config.explorationGoalFloor &&
            candidate.predictedSolveProbability >= config.explorationMinSolveProbability &&
            candidate.predictedSolveProbability <= config.explorationMaxSolveProbability,
        )
        .map(ensureExplorationReason);
    }

    selected.push(
      ...select({
        candidates: modeScores,
        count: limit,
        lane,
        input,
        config,
        alreadySelected: [],
        relevanceScore:
          input.context.mode === 'EXPLORE'
            ? (candidate) =>
                0.55 * candidate.baseScore + 0.45 * candidate.components.exploration
            : undefined,
      }),
    );
  }

  const items: RankedRecommendation[] = selected.slice(0, limit).map((selection, index) => ({
    ...selection.candidate,
    rank: index + 1,
    lane: selection.lane,
    finalScore: selection.finalScore,
    diversityPenalty: selection.diversityPenalty,
  }));

  return {
    algorithmVersion: config.algorithmVersion,
    generatedAt: new Date(now).toISOString(),
    items,
    diagnostics: {
      eligibleCount: filtered.eligible.length,
      excludedCount: filtered.exclusions.length,
      dueCount: dueScores.length,
      quotas: countQuotas(selected.slice(0, limit)),
      exclusions: filtered.exclusions,
    },
  };
}

/** Concise alias for call sites that prefer service-style naming. */
export const recommendProblems = generateRecommendations;
