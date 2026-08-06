import { clamp, compareWithSeed, normalizeTopicWeights } from './math';
import type {
  CandidateScore,
  ExperienceLevel,
  RecommendationConfig,
  RecommendationMode,
} from './types';

export interface MmrSelection {
  candidate: CandidateScore;
  finalScore: number;
  diversityPenalty: number;
}

function weightedTopicJaccard(left: CandidateScore, right: CandidateScore): number {
  const leftTopics = new Map(
    normalizeTopicWeights(left.problem.topics).map((topic) => [topic.topicId, topic.weight]),
  );
  const rightTopics = new Map(
    normalizeTopicWeights(right.problem.topics).map((topic) => [topic.topicId, topic.weight]),
  );
  const topicIds = new Set([...leftTopics.keys(), ...rightTopics.keys()]);
  let intersection = 0;
  let union = 0;

  for (const topicId of topicIds) {
    const leftWeight = leftTopics.get(topicId) ?? 0;
    const rightWeight = rightTopics.get(topicId) ?? 0;
    intersection += Math.min(leftWeight, rightWeight);
    union += Math.max(leftWeight, rightWeight);
  }

  return union > 0 ? clamp(intersection / union) : 0;
}

export function candidateSimilarity(
  left: CandidateScore,
  right: CandidateScore,
  config: RecommendationConfig,
): number {
  const samePattern =
    left.problem.pattern && right.problem.pattern
      ? left.problem.pattern === right.problem.pattern
      : left.primaryTopicId !== null && left.primaryTopicId === right.primaryTopicId;
  const sameDifficulty = left.problem.difficulty === right.problem.difficulty ? 1 : 0;

  return clamp(
      config.similarityWeights.topicOverlap * weightedTopicJaccard(left, right) +
      config.similarityWeights.primaryTopic * (samePattern ? 1 : 0) +
      config.similarityWeights.difficulty * sameDifficulty,
  );
}

function violatesSlateConstraint(options: {
  candidate: CandidateScore;
  selected: CandidateScore[];
  slateLimit: number;
  experienceLevel: ExperienceLevel;
  mode: RecommendationMode;
  config: RecommendationConfig;
}): boolean {
  if (options.mode === 'CHALLENGE') return false;

  const primaryTopicLimit = Math.max(
    1,
    Math.ceil(
      (options.slateLimit * options.config.maxPrimaryTopicPerFive) / 5,
    ),
  );
  if (options.candidate.primaryTopicId) {
    const sameTopicCount = options.selected.filter(
      (item) => item.primaryTopicId === options.candidate.primaryTopicId,
    ).length;
    if (sameTopicCount >= primaryTopicLimit) return true;
  }

  if (options.experienceLevel === 'BEGINNER' && options.candidate.problem.difficulty === 'HARD') {
    const hardLimit = Math.max(
      1,
      Math.ceil((options.slateLimit * options.config.maxBeginnerHardPerFive) / 5),
    );
    const hardCount = options.selected.filter(
      (item) => item.problem.difficulty === 'HARD',
    ).length;
    if (hardCount >= hardLimit) return true;
  }

  return false;
}

export function selectWithMmr(
  candidates: CandidateScore[],
  limit: number,
  options: {
    config: RecommendationConfig;
    seed: string | number;
    experienceLevel: ExperienceLevel;
    mode: RecommendationMode;
    slateLimit?: number;
    selected?: CandidateScore[];
    relevanceScore?: (candidate: CandidateScore) => number;
  },
): MmrSelection[] {
  if (limit <= 0 || candidates.length === 0) return [];

  const selected = [...(options.selected ?? [])];
  const selectedIds = new Set(selected.map((candidate) => candidate.problem.id));
  const remaining = candidates.filter((candidate) => !selectedIds.has(candidate.problem.id));
  const selections: MmrSelection[] = [];
  const relevanceScore = options.relevanceScore ?? ((candidate: CandidateScore) => candidate.baseScore);
  const diversityWeight = 1 - options.config.mmrRelevanceWeight;
  const slateLimit = options.slateLimit ?? selected.length + limit;

  while (selections.length < limit && remaining.length > 0) {
    let pool = remaining.filter(
      (candidate) =>
        !violatesSlateConstraint({
          candidate,
          selected,
          slateLimit,
          experienceLevel: options.experienceLevel,
          mode: options.mode,
          config: options.config,
        }),
    );

    // Sparse catalogs should still return a complete slate. Constraints are
    // relaxed only after every remaining item violates one.
    if (pool.length === 0) pool = remaining;

    const ranked = pool.map((candidate) => {
      const maximumSimilarity = selected.reduce(
        (maximum, existing) =>
          Math.max(maximum, candidateSimilarity(candidate, existing, options.config)),
        0,
      );
      const diversityPenalty = diversityWeight * maximumSimilarity;
      const selectionScore =
        options.config.mmrRelevanceWeight * clamp(relevanceScore(candidate)) - diversityPenalty;
      const finalScore = clamp(
        options.config.mmrRelevanceWeight * candidate.baseScore - diversityPenalty,
      );

      return { candidate, selectionScore, finalScore, diversityPenalty };
    });

    ranked.sort((left, right) =>
      compareWithSeed(
        left.selectionScore,
        right.selectionScore,
        left.candidate.problem.id,
        right.candidate.problem.id,
        options.seed,
      ),
    );

    const winner = ranked[0];
    selections.push({
      candidate: winner.candidate,
      finalScore: winner.finalScore,
      diversityPenalty: winner.diversityPenalty,
    });
    selected.push(winner.candidate);
    selectedIds.add(winner.candidate.problem.id);
    const winnerIndex = remaining.findIndex(
      (candidate) => candidate.problem.id === winner.candidate.problem.id,
    );
    remaining.splice(winnerIndex, 1);
  }

  return selections;
}
