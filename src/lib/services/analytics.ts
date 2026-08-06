import "server-only";

import { AttemptOutcome, PlanStatus, Prisma } from "@prisma/client";
import { addDays, differenceInCalendarDays, startOfWeek, subDays } from "date-fns";
import { db } from "@/lib/db";

function localDay(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(`${values.year}-${values.month}-${values.day}T00:00:00.000Z`);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function calculateStreak(days: Date[], today: Date) {
  const active = new Set(days.map(dateKey));
  let cursor = today;
  if (!active.has(dateKey(cursor))) cursor = subDays(cursor, 1);
  let streak = 0;
  while (active.has(dateKey(cursor))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

function createSeries(
  activity: Array<{ day: Date; attempted: number; solved: number; reviewed: number; minutes: number; points: number }>,
  today: Date,
  days: number,
) {
  const byDay = new Map(activity.map((entry) => [dateKey(entry.day), entry]));
  return Array.from({ length: days }, (_, index) => {
    const day = addDays(subDays(today, days - 1), index);
    const entry = byDay.get(dateKey(day));
    return {
      date: dateKey(day),
      attempted: entry?.attempted ?? 0,
      solved: entry?.solved ?? 0,
      reviewed: entry?.reviewed ?? 0,
      minutes: entry?.minutes ?? 0,
      points: entry?.points ?? 0,
    };
  });
}

export async function getAnalytics(userId: string, timezone: string, rangeDays = 30) {
  const today = localDay(new Date(), timezone);
  const rangeFrom = subDays(today, rangeDays - 1);
  const activityFrom = subDays(today, Math.max(84, rangeDays) - 1);
  const [activity, streakActivity, attempts, mastery, totalSolved, dueReviews, activePlan, integrations] = await Promise.all([
    db.dailyActivity.findMany({
      where: { userId, day: { gte: activityFrom } },
      orderBy: { day: "asc" },
    }),
    db.dailyActivity.findMany({
      where: { userId, day: { lte: today }, attempted: { gt: 0 } },
      select: { day: true },
      orderBy: { day: "desc" },
    }),
    db.attempt.findMany({
      where: { userId, completedAt: { gte: rangeFrom } },
      select: {
        outcome: true,
        durationMinutes: true,
        completedAt: true,
        problem: { select: { difficulty: true } },
      },
      orderBy: { completedAt: "asc" },
    }),
    db.userTopicMastery.findMany({
      where: { userId },
      include: { topic: true },
      orderBy: [{ mastery: "asc" }, { topic: { sortOrder: "asc" } }],
    }),
    db.userProblemState.count({ where: { userId, solveCount: { gt: 0 } } }),
    db.userProblemState.count({ where: { userId, nextReviewAt: { lte: new Date() } } }),
    db.studyPlan.findFirst({
      where: { userId, status: PlanStatus.ACTIVE },
      orderBy: { createdAt: "desc" },
      include: { items: { orderBy: [{ scheduledFor: "asc" }, { position: "asc" }] } },
    }),
    db.platformIdentity.findMany({
      where: { userId },
      include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 1 } },
      orderBy: { platform: "asc" },
    }),
  ]);

  const series = createSeries(activity, today, rangeDays);
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekActivity = activity.filter((entry) => entry.day >= weekStart);
  const weekSolved = weekActivity.reduce((total, entry) => total + entry.solved, 0);
  const weekMinutes = weekActivity.reduce((total, entry) => total + entry.minutes, 0);
  const solvedAttempts = attempts.filter((attempt) => attempt.outcome === AttemptOutcome.SOLVED);
  const meaningfulAttempts = attempts.filter((attempt) => attempt.outcome !== AttemptOutcome.ABANDONED);
  const accuracy = meaningfulAttempts.length ? solvedAttempts.length / meaningfulAttempts.length : 0;
  const averageSolveMinutes = solvedAttempts.length
    ? Math.round(solvedAttempts.reduce((total, attempt) => total + attempt.durationMinutes, 0) / solvedAttempts.length)
    : 0;

  const difficulty = (["EASY", "MEDIUM", "HARD"] as const).map((level) => {
    const matching = attempts.filter((attempt) => attempt.problem.difficulty === level);
    const solved = matching.filter((attempt) => attempt.outcome === AttemptOutcome.SOLVED).length;
    return {
      difficulty: level,
      attempted: matching.length,
      solved,
      accuracy: matching.length ? solved / matching.length : 0,
    };
  });

  const masteryValues = mastery.map((item) => item.mastery);
  const averageMastery = masteryValues.length
    ? masteryValues.reduce((total, value) => total + value, 0) / masteryValues.length
    : 0;
  const planCompleted = activePlan?.items.filter((item) => item.status === "COMPLETED").length ?? 0;
  const planTotal = activePlan?.items.length ?? 0;

  return {
    generatedAt: new Date().toISOString(),
    rangeDays,
    summary: {
      totalSolved,
      weekSolved,
      weekMinutes,
      currentStreak: calculateStreak(streakActivity.map((entry) => entry.day), today),
      dueReviews,
      accuracy,
      averageSolveMinutes,
      averageMastery,
    },
    series,
    heatmap: createSeries(activity, today, 84),
    difficulty,
    mastery: mastery.map((item) => ({
      topicId: item.topicId,
      slug: item.topic.slug,
      topic: item.topic.name,
      mastery: item.mastery,
      theta: item.theta,
      uncertainty: item.uncertainty,
      attempts: item.attemptCount,
      lastPracticedAt: item.lastPracticedAt?.toISOString() ?? null,
      nextReviewAt: item.nextReviewAt?.toISOString() ?? null,
    })),
    insight: mastery[0]
      ? {
          title: `${mastery[0].topic.name} is the clearest growth opportunity`,
          detail: `Current estimated mastery is ${Math.round(mastery[0].mastery * 100)}%. Your next queue will prioritize well-matched ${mastery[0].topic.name.toLowerCase()} practice.`,
        }
      : {
          title: "Your baseline is ready to calibrate",
          detail: "Complete a few recommended problems and Invariant will replace estimates with observed mastery.",
        },
    plan: activePlan
      ? {
          id: activePlan.id,
          title: activePlan.title,
          startDate: dateKey(activePlan.startDate),
          endDate: dateKey(activePlan.endDate),
          completed: planCompleted,
          total: planTotal,
          progress: planTotal ? planCompleted / planTotal : 0,
          daysRemaining: Math.max(0, differenceInCalendarDays(activePlan.endDate, today)),
        }
      : null,
    integrations: integrations.map((identity) => ({
      platform: identity.platform,
      handle: identity.handle,
      status: identity.status,
      lastSyncedAt: identity.lastSyncedAt?.toISOString() ?? null,
      stats: identity.snapshots[0]
        ? {
            totalSolved: identity.snapshots[0].totalSolved,
            rating: identity.snapshots[0].rating,
            ranking: identity.snapshots[0].ranking,
          }
        : null,
    })),
  };
}

export type AnalyticsData = Prisma.PromiseReturnType<typeof getAnalytics>;
