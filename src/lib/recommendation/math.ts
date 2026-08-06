import type { DateValue, ExperienceLevel, ProblemTopic } from './types';

export const DAY_MS = 24 * 60 * 60 * 1_000;
export const HOUR_MS = 60 * 60 * 1_000;

export function clamp(value: number, minimum = 0, maximum = 1): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

export function sigmoid(value: number): number {
  if (value >= 0) {
    const exponential = Math.exp(-value);
    return 1 / (1 + exponential);
  }

  const exponential = Math.exp(value);
  return exponential / (1 + exponential);
}

export function masteryFromTheta(theta: number): number {
  return sigmoid(clamp(theta, -3, 3));
}

export function defaultTheta(experienceLevel: ExperienceLevel): number {
  switch (experienceLevel) {
    case 'BEGINNER':
      return -1.25;
    case 'ADVANCED':
      return 0.65;
    case 'INTERMEDIATE':
    default:
      return -0.25;
  }
}

export function toEpoch(value: DateValue | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const epoch = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(epoch) ? epoch : null;
}

export function normalizeTopicWeights(topics: ProblemTopic[]): ProblemTopic[] {
  const valid = topics.filter(
    (topic) => topic.topicId.length > 0 && Number.isFinite(topic.weight) && topic.weight > 0,
  );
  const total = valid.reduce((sum, topic) => sum + topic.weight, 0);

  if (total <= 0) return [];
  return valid.map((topic) => ({ ...topic, weight: topic.weight / total }));
}

/** FNV-1a, used only to provide portable and deterministic tie-breaking. */
export function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function deterministicTieValue(seed: string | number, id: string): number {
  return stableHash(`${String(seed)}:${id}`) / 0xffffffff;
}

export function compareWithSeed(
  leftScore: number,
  rightScore: number,
  leftId: string,
  rightId: string,
  seed: string | number,
): number {
  const difference = rightScore - leftScore;
  if (Math.abs(difference) > 1e-12) return difference;

  const tieDifference =
    deterministicTieValue(seed, rightId) - deterministicTieValue(seed, leftId);
  if (Math.abs(tieDifference) > 1e-12) return tieDifference;
  return leftId.localeCompare(rightId);
}
