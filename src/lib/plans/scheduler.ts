import type { PlanScheduleCandidate, ScheduledPlanItem } from "./types";

const DAY_MS = 24 * 60 * 60 * 1_000;

interface DayBucket {
  date: string;
  index: number;
  minutes: number;
  items: PlanScheduleCandidate[];
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function overlapPenalty(day: DayBucket, candidate: PlanScheduleCandidate) {
  const sameTopic = candidate.primaryTopicId
    ? day.items.some((item) => item.primaryTopicId === candidate.primaryTopicId)
    : false;
  const samePattern = candidate.pattern
    ? day.items.some((item) => item.pattern === candidate.pattern)
    : false;
  const anotherHard =
    candidate.difficulty === "HARD" &&
    day.items.some((item) => item.difficulty === "HARD");

  return Number(sameTopic) * 0.8 + Number(samePattern) * 0.65 + Number(anotherHard) * 1.2;
}

function chooseDay(
  days: DayBucket[],
  candidate: PlanScheduleCandidate,
  problemsPerDay: number,
  minutesPerDay: number,
) {
  const available = days.filter((day) => day.items.length < problemsPerDay);
  if (!available.length) return null;

  return available
    .map((day) => {
      const projectedMinutes = day.minutes + candidate.estimatedMinutes;
      const overload = Math.max(0, projectedMinutes - minutesPerDay) / Math.max(1, minutesPerDay);
      const load = day.minutes / Math.max(1, minutesPerDay);
      const reviewTiming = candidate.lane === "REVIEW" ? day.index * 2 : 0;
      const score =
        reviewTiming +
        overload * 2.5 +
        load +
        overlapPenalty(day, candidate) +
        day.items.length * 0.2 +
        day.index * 0.0001;
      return { day, score };
    })
    .sort((left, right) => left.score - right.score || left.day.index - right.day.index)[0]?.day ?? null;
}

/**
 * Deterministic greedy scheduling. Due reviews are pulled toward the front;
 * new work is balanced by time while avoiding same-topic, same-pattern, and
 * multiple-Hard clusters when the available days permit it.
 */
export function schedulePlanItems(options: {
  candidates: PlanScheduleCandidate[];
  startDate: Date;
  durationDays: number;
  problemsPerDay: number;
  minutesPerDay: number;
}): ScheduledPlanItem[] {
  const durationDays = Math.max(1, Math.floor(options.durationDays));
  const problemsPerDay = Math.max(1, Math.floor(options.problemsPerDay));
  const days: DayBucket[] = Array.from({ length: durationDays }, (_, index) => ({
    date: dateKey(addDays(options.startDate, index)),
    index,
    minutes: 0,
    items: [],
  }));
  const unique = new Map<string, PlanScheduleCandidate>();
  for (const candidate of options.candidates) {
    if (!unique.has(candidate.problemId)) unique.set(candidate.problemId, candidate);
  }
  const ordered = [...unique.values()].sort(
    (left, right) =>
      Number(right.lane === "REVIEW") - Number(left.lane === "REVIEW") ||
      left.rank - right.rank ||
      left.problemId.localeCompare(right.problemId),
  );

  for (const candidate of ordered) {
    const day = chooseDay(days, candidate, problemsPerDay, options.minutesPerDay);
    if (!day) break;
    day.items.push(candidate);
    day.minutes += candidate.estimatedMinutes;
  }

  return days.flatMap((day) =>
    day.items
      .slice()
      .sort(
        (left, right) =>
          Number(right.lane === "REVIEW") - Number(left.lane === "REVIEW") ||
          left.rank - right.rank ||
          left.problemId.localeCompare(right.problemId),
      )
      .map((candidate, index) => ({
        ...candidate,
        scheduledFor: day.date,
        position: index + 1,
      })),
  );
}
