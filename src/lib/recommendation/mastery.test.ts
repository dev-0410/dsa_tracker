import { describe, expect, it } from 'vitest';

import {
  effectiveAttemptOutcome,
  mapAttemptToReviewRating,
  updateTopicMastery,
} from './mastery';
import type { RecommendationProblem, TopicMasteryState } from './types';

function problem(overrides: Partial<RecommendationProblem> = {}): RecommendationProblem {
  return {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'MEDIUM',
    difficultyB: 0,
    estimatedMinutes: 20,
    qualityScore: 0.9,
    isActive: true,
    isPremium: false,
    topics: [{ topicId: 'hash-map', weight: 1, isPrimary: true }],
    ...overrides,
  };
}

describe('mastery updates', () => {
  it('raises mastery after a solve and lowers it after a failure', () => {
    const current: TopicMasteryState[] = [
      { topicId: 'hash-map', theta: 0, attemptCount: 0, effectiveSuccesses: 0 },
    ];
    const solved = updateTopicMastery({
      problem: problem(),
      currentMastery: current,
      attempt: { outcome: 'SOLVED', durationMinutes: 20, hintsUsed: 0 },
      experienceLevel: 'INTERMEDIATE',
    });
    const failed = updateTopicMastery({
      problem: problem(),
      currentMastery: current,
      attempt: { outcome: 'FAILED', durationMinutes: 20 },
      experienceLevel: 'INTERMEDIATE',
    });

    expect(solved.updated).toBe(true);
    expect(solved.topics[0].afterTheta).toBeGreaterThan(solved.topics[0].beforeTheta);
    expect(failed.topics[0].afterTheta).toBeLessThan(failed.topics[0].beforeTheta);
    expect(solved.topics[0].attemptCount).toBe(1);
  });

  it('credits assisted or excessively slow solves less than clean solves', () => {
    const clean = effectiveAttemptOutcome(problem(), {
      outcome: 'SOLVED',
      durationMinutes: 20,
      hintsUsed: 0,
    });
    const assisted = effectiveAttemptOutcome(problem(), {
      outcome: 'SOLVED',
      durationMinutes: 60,
      hintsUsed: 3,
    });
    expect(clean).toBe(1);
    expect(assisted).toBe(0.55);
  });

  it('ignores a short, non-meaningful abandonment', () => {
    const result = updateTopicMastery({
      problem: problem(),
      currentMastery: [{ topicId: 'hash-map', theta: 0.2, attemptCount: 4 }],
      attempt: { outcome: 'ABANDONED', durationMinutes: 2 },
      experienceLevel: 'INTERMEDIATE',
    });
    expect(result.updated).toBe(false);
    expect(result.topics[0].afterTheta).toBe(result.topics[0].beforeTheta);
    expect(result.topics[0].attemptCount).toBe(4);
  });

  it('decays the learning rate as evidence accumulates', () => {
    const fresh = updateTopicMastery({
      problem: problem(),
      currentMastery: [{ topicId: 'hash-map', theta: 0, attemptCount: 0 }],
      attempt: { outcome: 'SOLVED' },
      experienceLevel: 'INTERMEDIATE',
    });
    const established = updateTopicMastery({
      problem: problem(),
      currentMastery: [{ topicId: 'hash-map', theta: 0, attemptCount: 80 }],
      attempt: { outcome: 'SOLVED' },
      experienceLevel: 'INTERMEDIATE',
    });
    expect(Math.abs(fresh.topics[0].delta)).toBeGreaterThan(
      Math.abs(established.topics[0].delta),
    );
  });

  it('distributes evidence by normalized topic weights', () => {
    const multiTopic = problem({
      topics: [
        { topicId: 'graphs', weight: 7, isPrimary: true },
        { topicId: 'bfs', weight: 3 },
      ],
    });
    const result = updateTopicMastery({
      problem: multiTopic,
      currentMastery: [
        { topicId: 'graphs', theta: 0, attemptCount: 0 },
        { topicId: 'bfs', theta: 0, attemptCount: 0 },
      ],
      attempt: { outcome: 'SOLVED' },
      experienceLevel: 'INTERMEDIATE',
    });

    expect(result.topics[0].delta / result.topics[1].delta).toBeCloseTo(7 / 3, 10);
    expect(result.topics[0].effectiveSuccesses).toBeCloseTo(0.7, 12);
    expect(result.topics[1].effectiveSuccesses).toBeCloseTo(0.3, 12);
  });

  it('maps attempt evidence to FSRS-compatible review ratings', () => {
    expect(mapAttemptToReviewRating(problem(), { outcome: 'FAILED' })).toBe('AGAIN');
    expect(mapAttemptToReviewRating(problem(), { outcome: 'PARTIAL' })).toBe('HARD');
    expect(
      mapAttemptToReviewRating(problem(), {
        outcome: 'SOLVED',
        hintsUsed: 1,
        durationMinutes: 20,
      }),
    ).toBe('HARD');
    expect(
      mapAttemptToReviewRating(problem(), {
        outcome: 'SOLVED',
        hintsUsed: 0,
        durationMinutes: 20,
      }),
    ).toBe('GOOD');
    expect(
      mapAttemptToReviewRating(problem(), {
        outcome: 'SOLVED',
        hintsUsed: 0,
        durationMinutes: 10,
        confidence: 5,
      }),
    ).toBe('EASY');
  });

  it('records partial progress between a failure and a clean solve', () => {
    expect(effectiveAttemptOutcome(problem(), { outcome: 'FAILED' })).toBe(0);
    expect(effectiveAttemptOutcome(problem(), { outcome: 'PARTIAL' })).toBe(0.35);
    expect(effectiveAttemptOutcome(problem(), { outcome: 'SOLVED' })).toBe(1);
  });

  it('keeps theta, mastery, and uncertainty finite at extreme inputs', () => {
    const result = updateTopicMastery({
      problem: problem({ difficultyB: -3 }),
      currentMastery: [
        {
          topicId: 'hash-map',
          theta: 100,
          attemptCount: 1_000_000,
          effectiveSuccesses: 999_999,
        },
      ],
      attempt: { outcome: 'SOLVED' },
      experienceLevel: 'ADVANCED',
    });
    expect(result.topics[0].afterTheta).toBeLessThanOrEqual(3);
    expect(Number.isFinite(result.topics[0].afterMastery)).toBe(true);
    expect(Number.isFinite(result.topics[0].uncertainty)).toBe(true);
  });
});
