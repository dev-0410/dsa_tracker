import { describe, expect, it } from 'vitest';

import { resolveConfig } from './config';
import { candidateSimilarity, selectWithMmr } from './diversity';
import { generateRecommendations } from './engine';
import { filterCandidates } from './filters';
import {
  calculateBehaviorAffinity,
  calculateDifficultyFit,
  calculateUcbExploration,
  scoreCandidate,
} from './scoring';
import type {
  CandidateScore,
  PartialRecommendationConfig,
  RecommendationContext,
  RecommendationInput,
  RecommendationProblem,
  TopicGoal,
  TopicMasteryState,
  UserProblemState,
} from './types';

const NOW = new Date('2026-08-06T12:00:00.000Z');

function problem(
  id: string,
  topicId: string,
  overrides: Partial<RecommendationProblem> = {},
): RecommendationProblem {
  return {
    id,
    title: `Problem ${id}`,
    source: 'LEETCODE',
    url: `https://example.com/${id}`,
    difficulty: 'EASY',
    difficultyB: -0.5,
    estimatedMinutes: 25,
    qualityScore: 0.8,
    isActive: true,
    isPremium: false,
    topics: [{ topicId, topicName: topicId, weight: 1, isPrimary: true }],
    ...overrides,
  };
}

function context(overrides: Partial<RecommendationContext> = {}): RecommendationContext {
  return {
    mode: 'DAILY',
    limit: 6,
    now: NOW,
    seed: 'stable-seed',
    experienceLevel: 'INTERMEDIATE',
    minutesAvailable: 45,
    includePremium: false,
    ...overrides,
  };
}

function recommendationInput(
  candidates: RecommendationProblem[],
  overrides: Partial<RecommendationInput> = {},
): RecommendationInput {
  return {
    candidates,
    topicMastery: [],
    topicGoals: [],
    topicBehavior: [],
    problemStates: [],
    context: context(),
    ...overrides,
  };
}

function score(
  candidate: RecommendationProblem,
  options: {
    mastery?: TopicMasteryState[];
    goals?: TopicGoal[];
    state?: UserProblemState;
    config?: PartialRecommendationConfig;
  } = {},
): CandidateScore {
  const config = resolveConfig(options.config);
  return scoreCandidate(candidate, {
    topicMastery: options.mastery ?? [],
    topicGoals: options.goals ?? [],
    topicBehavior: [],
    problemState: options.state,
    context: context(),
    config,
  });
}

describe('feature scoring', () => {
  it('scores a weak goal topic above an already-mastered topic when isolating mastery need', () => {
    const needOnly: PartialRecommendationConfig = {
      weights: {
        need: 1,
        goalFit: 0,
        reviewUrgency: 0,
        difficultyFit: 0,
        behavior: 0,
        quality: 0,
        exploration: 0,
      },
    };
    const mastery: TopicMasteryState[] = [
      { topicId: 'graphs', theta: -1.2, attemptCount: 3 },
      { topicId: 'arrays', theta: 2, attemptCount: 30 },
    ];
    const goals: TopicGoal[] = [
      { topicId: 'graphs', priority: 1, targetMastery: 0.8 },
      { topicId: 'arrays', priority: 1, targetMastery: 0.8 },
    ];

    const graph = score(problem('graph', 'graphs'), { mastery, goals, config: needOnly });
    const array = score(problem('array', 'arrays'), { mastery, goals, config: needOnly });

    expect(graph.baseScore).toBeGreaterThan(array.baseScore);
    expect(graph.components.need).toBeGreaterThan(0.6);
    expect(array.components.need).toBe(0);
  });

  it('makes contribution arithmetic transparent and bounded', () => {
    const candidate = score(problem('transparent', 'graphs'));
    const contributionTotal = Object.values(candidate.contributions).reduce(
      (total, contribution) => total + contribution,
      0,
    );

    expect(candidate.baseScore).toBeCloseTo(contributionTotal, 12);
    expect(candidate.baseScore).toBeGreaterThanOrEqual(0);
    expect(candidate.baseScore).toBeLessThanOrEqual(1);
    for (const component of Object.values(candidate.components)) {
      expect(Number.isFinite(component)).toBe(true);
      expect(component).toBeGreaterThanOrEqual(0);
      expect(component).toBeLessThanOrEqual(1);
    }
  });

  it('peaks difficulty fit at the requested solve probability', () => {
    expect(calculateDifficultyFit(0.65, 0.65, 0.18)).toBe(1);
    expect(calculateDifficultyFit(0.65, 0.65, 0.18)).toBeGreaterThan(
      calculateDifficultyFit(0.25, 0.65, 0.18),
    );
  });

  it('uses smoothed behavior affinity without treating cold start as zero interest', () => {
    expect(calculateBehaviorAffinity()).toBe(0.5);
    const engaged = calculateBehaviorAffinity({
      topicId: 'graphs',
      impressions: 100,
      starts: 80,
      completions: 70,
      dismissals: 0,
    });
    const disengaged = calculateBehaviorAffinity({
      topicId: 'graphs',
      impressions: 100,
      starts: 2,
      completions: 0,
      dismissals: 30,
    });
    expect(engaged).toBeGreaterThan(disengaged);
  });

  it('gives under-exposed topics a larger deterministic UCB bonus', () => {
    expect(calculateUcbExploration(0, 200)).toBeGreaterThan(
      calculateUcbExploration(100, 200),
    );
    expect(calculateUcbExploration(0, 200)).toBeLessThanOrEqual(1);
  });

  it('rejects invalid weight configurations instead of silently changing semantics', () => {
    expect(() => resolveConfig({ weights: { need: 0.9 } })).toThrow(/sum to 1/);
  });
});

describe('candidate exclusions', () => {
  it('applies catalog, access, recency, solve, dismissal, and prerequisite rules', () => {
    const valid = problem('valid', 'arrays');
    const inactive = problem('inactive', 'arrays', { isActive: false });
    const premium = problem('premium', 'arrays', { isPremium: true });
    const invalid = problem('invalid', 'arrays', { topics: [] });
    const recent = problem('recent', 'arrays');
    const dismissed = problem('dismissed', 'arrays');
    const locked = problem('locked', 'graphs', { prerequisiteTopicIds: ['trees'] });
    const config = resolveConfig();
    const result = filterCandidates({
      candidates: [valid, inactive, premium, invalid, recent, dismissed, locked],
      problemStates: [
        {
          problemId: 'recent',
          attemptCount: 1,
          solveCount: 1,
          solved: true,
          lastServedAt: new Date(NOW.getTime() - 60 * 60 * 1_000),
        },
        {
          problemId: 'dismissed',
          attemptCount: 0,
          solveCount: 0,
          solved: false,
          dismissedUntil: new Date(NOW.getTime() + 24 * 60 * 60 * 1_000),
        },
      ],
      topicMastery: [{ topicId: 'trees', theta: -2, attemptCount: 1 }],
      context: context(),
      config,
    });

    expect(result.eligible.map((item) => item.problem.id)).toEqual(['valid']);
    expect(result.exclusions.find((item) => item.problemId === 'inactive')?.codes).toContain(
      'INACTIVE',
    );
    expect(result.exclusions.find((item) => item.problemId === 'premium')?.codes).toContain(
      'PREMIUM_LOCKED',
    );
    expect(result.exclusions.find((item) => item.problemId === 'invalid')?.codes).toContain(
      'INVALID_METADATA',
    );
    expect(result.exclusions.find((item) => item.problemId === 'recent')?.codes).toEqual(
      expect.arrayContaining(['RECENTLY_SERVED', 'SOLVED_NOT_DUE']),
    );
    expect(result.exclusions.find((item) => item.problemId === 'dismissed')?.codes).toContain(
      'DISMISSED',
    );
    expect(result.exclusions.find((item) => item.problemId === 'locked')?.codes).toContain(
      'UNMET_PREREQUISITE',
    );
  });

  it('allows a solved, recently served problem when its review is due', () => {
    const due = problem('due', 'graphs');
    const state: UserProblemState = {
      problemId: due.id,
      attemptCount: 3,
      solveCount: 1,
      solved: true,
      dueAt: new Date(NOW.getTime() - 24 * 60 * 60 * 1_000),
      scheduledDays: 2,
      lastServedAt: new Date(NOW.getTime() - 60 * 60 * 1_000),
    };
    const result = filterCandidates({
      candidates: [due],
      problemStates: [state],
      topicMastery: [],
      context: context(),
      config: resolveConfig(),
    });

    expect(result.eligible).toHaveLength(1);
    expect(result.exclusions).toHaveLength(0);
  });

  it('deduplicates catalog identifiers', () => {
    const duplicate = problem('same-id', 'arrays');
    const result = filterCandidates({
      candidates: [duplicate, { ...duplicate }],
      problemStates: [],
      topicMastery: [],
      context: context(),
      config: resolveConfig(),
    });
    expect(result.eligible).toHaveLength(1);
    expect(result.exclusions[0]).toEqual({ problemId: 'same-id', codes: ['DUPLICATE_ID'] });
  });
});

describe('MMR diversity', () => {
  it('prefers a slightly lower-relevance different topic over a near duplicate', () => {
    const config = resolveConfig();
    const arraysA = { ...score(problem('arrays-a', 'arrays')), baseScore: 0.9 };
    const arraysB = { ...score(problem('arrays-b', 'arrays')), baseScore: 0.89 };
    const graph = { ...score(problem('graph-a', 'graphs')), baseScore: 0.8 };

    expect(candidateSimilarity(arraysA, arraysB, config)).toBeCloseTo(1, 12);
    expect(candidateSimilarity(arraysA, graph, config)).toBeCloseTo(0.1, 12);

    const selected = selectWithMmr([arraysA, arraysB, graph], 2, {
      config,
      seed: 'mmr',
      experienceLevel: 'INTERMEDIATE',
      mode: 'LEARN',
    });
    expect(selected.map((item) => item.candidate.problem.id)).toEqual(['arrays-a', 'graph-a']);
    expect(selected[1].diversityPenalty).toBeLessThan(0.02);
  });

  it('fills a slate from a sparse single-topic catalog by relaxing constraints last', () => {
    const candidates = Array.from({ length: 4 }, (_, index) =>
      score(problem(`array-${index}`, 'arrays')),
    );
    const selected = selectWithMmr(candidates, 4, {
      config: resolveConfig(),
      seed: 'sparse',
      experienceLevel: 'BEGINNER',
      mode: 'LEARN',
    });
    expect(selected).toHaveLength(4);
    expect(new Set(selected.map((item) => item.candidate.problem.id)).size).toBe(4);
  });
});

describe('recommendation orchestration', () => {
  it('returns a stable cold-start slate with a controlled exploration slot', () => {
    const candidates = ['arrays', 'graphs', 'trees', 'dp', 'strings', 'greedy', 'heap', 'stack'].map(
      (topic, index) => problem(`p-${index}`, topic),
    );
    const input = recommendationInput(candidates);
    const first = generateRecommendations(input);
    const replay = generateRecommendations(input);

    expect(first).toEqual(replay);
    expect(first.items).toHaveLength(6);
    expect(first.diagnostics.quotas.explore).toBe(1);
    expect(first.items.filter((item) => item.lane === 'EXPLORE')).toHaveLength(1);
    expect(first.items.find((item) => item.lane === 'EXPLORE')?.reasons).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'EXPLORE_UNCERTAINTY' })]),
    );
    expect(new Set(first.items.map((item) => item.problem.id)).size).toBe(6);
  });

  it('allocates due reviews, learning, and exploration in a daily slate', () => {
    const candidates = Array.from({ length: 10 }, (_, index) =>
      problem(`p-${index}`, `topic-${index}`),
    );
    const dueStates: UserProblemState[] = [0, 1].map((index) => ({
      problemId: `p-${index}`,
      attemptCount: 2,
      solveCount: 1,
      solved: true,
      dueAt: new Date(NOW.getTime() - (index + 1) * 24 * 60 * 60 * 1_000),
      scheduledDays: 3,
    }));
    const result = generateRecommendations(
      recommendationInput(candidates, { problemStates: dueStates }),
    );

    expect(result.diagnostics.dueCount).toBe(2);
    expect(result.diagnostics.quotas).toEqual({
      review: 2,
      learn: 3,
      explore: 1,
      challenge: 0,
    });
    expect(result.items.filter((item) => item.lane === 'REVIEW')).toHaveLength(2);
    for (const review of result.items.filter((item) => item.lane === 'REVIEW')) {
      expect(review.reasons[0].code).toBe('REVIEW_DUE');
    }
  });

  it('uses the exploration slot for a relevant under-exposed topic', () => {
    const candidates = [
      problem('arrays-a', 'arrays'),
      problem('arrays-b', 'arrays'),
      problem('graphs-a', 'graphs'),
      problem('trees-a', 'trees'),
      problem('dp-a', 'dp'),
      problem('heap-a', 'heap'),
      problem('stack-a', 'stack'),
    ];
    const result = generateRecommendations(
      recommendationInput(candidates, {
        topicGoals: candidates.map((candidate) => ({
          topicId: candidate.topics[0].topicId,
          priority: 1,
        })),
        topicBehavior: [
          { topicId: 'arrays', impressions: 100, starts: 70, completions: 50, dismissals: 1 },
          { topicId: 'graphs', impressions: 80, starts: 50, completions: 40, dismissals: 1 },
          { topicId: 'trees', impressions: 60, starts: 40, completions: 30, dismissals: 1 },
          { topicId: 'dp', impressions: 50, starts: 30, completions: 20, dismissals: 1 },
          { topicId: 'heap', impressions: 40, starts: 20, completions: 15, dismissals: 1 },
          { topicId: 'stack', impressions: 0, starts: 0, completions: 0, dismissals: 0 },
        ],
      }),
    );

    expect(result.items.find((item) => item.lane === 'EXPLORE')?.problem.id).toBe('stack-a');
  });

  it('returns only due cards in review mode', () => {
    const due = problem('due', 'graphs');
    const fresh = problem('fresh', 'arrays');
    const result = generateRecommendations(
      recommendationInput([due, fresh], {
        context: context({ mode: 'REVIEW', limit: 5 }),
        problemStates: [
          {
            problemId: 'due',
            attemptCount: 1,
            solveCount: 0,
            solved: false,
            lastOutcome: 'FAILED',
            dueAt: NOW,
            scheduledDays: 1,
          },
        ],
      }),
    );

    expect(result.items.map((item) => item.problem.id)).toEqual(['due']);
    expect(result.items[0].lane).toBe('REVIEW');
    expect(result.diagnostics.exclusions.find((item) => item.problemId === 'fresh')?.codes).toContain(
      'MODE_MISMATCH',
    );
  });

  it('does not emit NaN or invalid ranks from empty and malformed input', () => {
    const empty = generateRecommendations(recommendationInput([], { context: context({ limit: 20 }) }));
    expect(empty.items).toEqual([]);

    const mixed = generateRecommendations(
      recommendationInput([
        problem('good', 'arrays'),
        problem('bad', 'graphs', { qualityScore: Number.NaN }),
      ]),
    );
    expect(mixed.items).toHaveLength(1);
    expect(mixed.items[0].rank).toBe(1);
    expect(Number.isFinite(mixed.items[0].baseScore)).toBe(true);
    expect(Number.isFinite(mixed.items[0].finalScore)).toBe(true);
  });
});
