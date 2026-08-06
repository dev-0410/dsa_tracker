import { describe, expect, it } from "vitest";
import { schedulePlanItems } from "./scheduler";
import type { PlanScheduleCandidate } from "./types";

const startDate = new Date("2026-08-06T00:00:00.000Z");

function candidate(
  problemId: string,
  rank: number,
  overrides: Partial<PlanScheduleCandidate> = {},
): PlanScheduleCandidate {
  return {
    problemId,
    rank,
    lane: "LEARN",
    difficulty: "MEDIUM",
    estimatedMinutes: 30,
    primaryTopicId: `topic-${rank}`,
    pattern: `pattern-${rank}`,
    ...overrides,
  };
}

describe("study-plan scheduler", () => {
  it("is deterministic and spreads work across the configured dates", () => {
    const candidates = Array.from({ length: 8 }, (_, index) => candidate(`p-${index}`, index + 1));
    const options = {
      candidates,
      startDate,
      durationDays: 4,
      problemsPerDay: 2,
      minutesPerDay: 60,
    };
    const first = schedulePlanItems(options);
    const replay = schedulePlanItems(options);

    expect(first).toEqual(replay);
    expect(first).toHaveLength(8);
    const counts = first.reduce((byDate, item) => {
      byDate.set(item.scheduledFor, (byDate.get(item.scheduledFor) ?? 0) + 1);
      return byDate;
    }, new Map<string, number>());
    expect([...counts.values()]).toEqual([2, 2, 2, 2]);
  });

  it("pulls due reviews toward the start of the plan", () => {
    const scheduled = schedulePlanItems({
      candidates: [
        candidate("learn-1", 1),
        candidate("learn-2", 2),
        candidate("review-1", 8, { lane: "REVIEW" }),
      ],
      startDate,
      durationDays: 3,
      problemsPerDay: 1,
      minutesPerDay: 45,
    });

    expect(scheduled.find((item) => item.problemId === "review-1")?.scheduledFor).toBe("2026-08-06");
  });

  it("deduplicates candidates and never exceeds daily capacity", () => {
    const duplicate = candidate("same", 1);
    const scheduled = schedulePlanItems({
      candidates: [duplicate, { ...duplicate }, candidate("other", 2)],
      startDate,
      durationDays: 1,
      problemsPerDay: 1,
      minutesPerDay: 30,
    });

    expect(scheduled).toHaveLength(1);
    expect(new Set(scheduled.map((item) => item.problemId)).size).toBe(1);
  });

  it("avoids clustering same-topic and Hard problems when alternatives exist", () => {
    const scheduled = schedulePlanItems({
      candidates: [
        candidate("graph-hard-1", 1, { difficulty: "HARD", primaryTopicId: "graphs" }),
        candidate("graph-hard-2", 2, { difficulty: "HARD", primaryTopicId: "graphs" }),
        candidate("array", 3, { difficulty: "EASY", primaryTopicId: "arrays" }),
        candidate("tree", 4, { difficulty: "EASY", primaryTopicId: "trees" }),
      ],
      startDate,
      durationDays: 2,
      problemsPerDay: 2,
      minutesPerDay: 70,
    });

    const hardDates = scheduled
      .filter((item) => item.difficulty === "HARD")
      .map((item) => item.scheduledFor);
    expect(new Set(hardDates).size).toBe(2);
  });
});
