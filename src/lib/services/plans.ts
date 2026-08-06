import "server-only";

import {
  PlanItemStatus,
  PlanStatus,
  Prisma,
  RecommendationMode,
  type ExperienceLevel,
  type LearningGoal,
} from "@prisma/client";
import { ApiError } from "@/lib/api-response";
import { db } from "@/lib/db";
import { isStudyPlanItemTerminal, TERMINAL_STUDY_PLAN_ITEM_STATUSES } from "@/lib/plans/lifecycle";
import { schedulePlanItems } from "@/lib/plans/scheduler";
import type {
  CreateStudyPlanInput,
  PlanScheduleCandidate,
  StudyPlanDayView,
  StudyPlanItemStatus,
  StudyPlanItemView,
  StudyPlansView,
  StudyPlanView,
} from "@/lib/plans/types";
import { getRecommendations } from "@/lib/services/recommendations";

const DAY_MS = 24 * 60 * 60 * 1_000;
const MAX_PLAN_ITEMS = 28;

const planInclude = {
  items: {
    include: {
      problem: {
        include: {
          topics: {
            include: { topic: true },
            orderBy: [{ isPrimary: "desc" }, { weight: "desc" }],
          },
        },
      },
    },
    orderBy: [{ scheduledFor: "asc" }, { position: "asc" }],
  },
} satisfies Prisma.StudyPlanInclude;

type StoredPlan = Prisma.StudyPlanGetPayload<{ include: typeof planInclude }>;

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateFromKey(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || dateKey(date) !== value) {
    throw new ApiError(422, "INVALID_START_DATE", "Use a real calendar date in YYYY-MM-DD format.");
  }
  return date;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

export function localDateKey(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function presentItem(item: StoredPlan["items"][number]): StudyPlanItemView {
  return {
    id: item.id,
    status: item.status,
    scheduledFor: dateKey(item.scheduledFor),
    position: item.position,
    completedAt: item.completedAt?.toISOString() ?? null,
    problem: {
      id: item.problem.id,
      title: item.problem.title,
      slug: item.problem.slug,
      url: item.problem.url,
      platform: item.problem.platform,
      difficulty: item.problem.difficulty,
      estimatedMinutes: item.problem.estimatedMinutes,
      pattern: item.problem.pattern,
      topics: item.problem.topics.map((link) => ({
        id: link.topic.id,
        slug: link.topic.slug,
        name: link.topic.name,
        isPrimary: link.isPrimary,
      })),
    },
  };
}

export function presentStudyPlan(plan: StoredPlan): StudyPlanView {
  const items = plan.items.map(presentItem);
  const byDay = new Map<string, StudyPlanItemView[]>();
  for (const item of items) {
    const day = byDay.get(item.scheduledFor) ?? [];
    day.push(item);
    byDay.set(item.scheduledFor, day);
  }
  const days: StudyPlanDayView[] = [...byDay.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, dayItems]) => ({
      date,
      totalMinutes: dayItems.reduce((total, item) => total + item.problem.estimatedMinutes, 0),
      completed: dayItems.filter((item) => item.status === PlanItemStatus.COMPLETED).length,
      skipped: dayItems.filter((item) => item.status === PlanItemStatus.SKIPPED).length,
      items: dayItems.sort((left, right) => left.position - right.position),
    }));
  const completed = items.filter((item) => item.status === PlanItemStatus.COMPLETED).length;
  const skipped = items.filter((item) => item.status === PlanItemStatus.SKIPPED).length;
  const inProgress = items.filter((item) => item.status === PlanItemStatus.IN_PROGRESS).length;
  const terminal = items.filter((item) => isStudyPlanItemTerminal(item.status)).length;
  const totalMinutes = items.reduce((total, item) => total + item.problem.estimatedMinutes, 0);

  return {
    id: plan.id,
    title: plan.title,
    description: plan.description,
    status: plan.status,
    startDate: dateKey(plan.startDate),
    endDate: dateKey(plan.endDate),
    minutesPerDay: plan.minutesPerDay,
    createdAt: plan.createdAt.toISOString(),
    progress: {
      total: items.length,
      completed,
      skipped,
      inProgress,
      remaining: Math.max(0, items.length - completed - skipped),
      percent: items.length ? Math.round((terminal / items.length) * 100) : 0,
      totalMinutes,
    },
    days,
  };
}

export async function getStudyPlans(options: {
  userId: string;
  historyLimit?: number;
}): Promise<StudyPlansView> {
  const historyLimit = Math.min(10, Math.max(0, Math.floor(options.historyLimit ?? 4)));
  const plans = await db.studyPlan.findMany({
    where: { userId: options.userId },
    include: planInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: historyLimit + 4,
  });
  const active = plans.find((plan) => plan.status === PlanStatus.ACTIVE) ?? null;
  const history = plans
    .filter((plan) => plan.status !== PlanStatus.ACTIVE)
    .slice(0, historyLimit)
    .map(presentStudyPlan);

  return { active: active ? presentStudyPlan(active) : null, history };
}

function validatePlanRequest(input: CreateStudyPlanInput) {
  if (!Number.isInteger(input.durationDays) || input.durationDays < 7 || input.durationDays > 28) {
    throw new ApiError(422, "INVALID_PLAN_DURATION", "Plan duration must be between 7 and 28 days.");
  }
  if (!Number.isInteger(input.problemsPerDay) || input.problemsPerDay < 1 || input.problemsPerDay > 2) {
    throw new ApiError(422, "INVALID_DAILY_LOAD", "Choose one or two problems per day.");
  }
  if (input.durationDays * input.problemsPerDay > MAX_PLAN_ITEMS) {
    throw new ApiError(422, "PLAN_TOO_LARGE", `A plan can contain at most ${MAX_PLAN_ITEMS} problems.`);
  }
}

function isRetryableTransaction(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

async function completeStudyPlanIfTerminal(transaction: Prisma.TransactionClient, planId: string) {
  const nonTerminal = await transaction.studyPlanItem.count({
    where: {
      planId,
      status: { notIn: [...TERMINAL_STUDY_PLAN_ITEM_STATUSES] },
    },
  });
  if (nonTerminal > 0) return false;

  const completed = await transaction.studyPlan.updateMany({
    where: { id: planId, status: PlanStatus.ACTIVE },
    data: { status: PlanStatus.COMPLETED },
  });
  return completed.count > 0;
}

export async function createStudyPlan(options: {
  userId: string;
  timezone: string;
  experienceLevel: ExperienceLevel;
  learningGoal: LearningGoal;
  targetDate: Date | null;
  minutesPerDay: number;
  input: CreateStudyPlanInput;
}) {
  validatePlanRequest(options.input);
  const today = dateFromKey(localDateKey(new Date(), options.timezone));
  const startDate = options.input.startDate ? dateFromKey(options.input.startDate) : today;
  if (startDate < today) {
    throw new ApiError(422, "START_DATE_IN_PAST", "A new plan cannot start in the past.");
  }
  if (startDate > addDays(today, 30)) {
    throw new ApiError(422, "START_DATE_TOO_FAR", "Choose a start date within the next 30 days.");
  }

  const requestedItems = options.input.durationDays * options.input.problemsPerDay;
  const seed = [
    "plan-v1",
    options.userId,
    dateKey(startDate),
    options.input.durationDays,
    options.input.problemsPerDay,
  ].join(":");
  const feed = await getRecommendations({
    userId: options.userId,
    experienceLevel: options.experienceLevel,
    learningGoal: options.learningGoal,
    targetDate: options.targetDate,
    mode: RecommendationMode.DAILY,
    limit: requestedItems,
    minutesAvailable: options.minutesPerDay,
    includePremium: false,
    forceRefresh: true,
    seedOverride: seed,
    purpose: "PLAN",
  });
  const candidates: PlanScheduleCandidate[] = feed.items.map((item) => ({
    problemId: item.problem.id,
    rank: item.rank,
    lane: item.lane,
    difficulty: item.problem.difficulty,
    estimatedMinutes: item.problem.estimatedMinutes,
    primaryTopicId: item.problem.topics[0]?.id ?? null,
    pattern: item.problem.pattern,
  }));
  const scheduled = schedulePlanItems({
    candidates,
    startDate,
    durationDays: options.input.durationDays,
    problemsPerDay: options.input.problemsPerDay,
    minutesPerDay: options.minutesPerDay,
  });
  if (!scheduled.length) {
    throw new ApiError(409, "PLAN_HAS_NO_ITEMS", "No eligible problems are available for a new plan yet.");
  }

  const title = options.input.title?.trim() || `${options.input.durationDays}-day adaptive plan`;
  const endDate = addDays(startDate, options.input.durationDays - 1);
  const description = `${scheduled.length} explainable recommendations balanced across ${options.input.durationDays} days at roughly ${options.minutesPerDay} minutes per session.`;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const created = await db.$transaction(
        async (transaction) => {
          await transaction.studyPlan.updateMany({
            where: { userId: options.userId, status: PlanStatus.ACTIVE },
            data: { status: PlanStatus.ARCHIVED },
          });
          return transaction.studyPlan.create({
            data: {
              userId: options.userId,
              title,
              description,
              status: PlanStatus.ACTIVE,
              startDate,
              endDate,
              minutesPerDay: options.minutesPerDay,
              items: {
                create: scheduled.map((item) => ({
                  problemId: item.problemId,
                  scheduledFor: dateFromKey(item.scheduledFor),
                  position: item.position,
                  status: PlanItemStatus.TODO,
                })),
              },
            },
            include: planInclude,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return {
        plan: presentStudyPlan(created),
        requestedItems,
        plannedItems: scheduled.length,
        partial: scheduled.length < requestedItems,
        recommendationRunId: feed.runId,
      };
    } catch (error) {
      if (attempt < 3 && isRetryableTransaction(error)) continue;
      throw error;
    }
  }

  throw new ApiError(409, "CONCURRENT_PLAN_UPDATE", "The plan changed concurrently. Please try again.");
}

const allowedTransitions: Record<StudyPlanItemStatus, StudyPlanItemStatus[]> = {
  TODO: ["IN_PROGRESS", "SKIPPED", "COMPLETED"],
  IN_PROGRESS: ["TODO", "SKIPPED", "COMPLETED"],
  SKIPPED: ["TODO", "IN_PROGRESS", "COMPLETED"],
  COMPLETED: [],
};

export async function updateStudyPlanItem(options: {
  userId: string;
  planId: string;
  itemId: string;
  status: StudyPlanItemStatus;
}) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await db.$transaction(
        async (transaction) => {
          const item = await transaction.studyPlanItem.findFirst({
            where: {
              id: options.itemId,
              planId: options.planId,
              plan: { userId: options.userId },
            },
            include: { plan: true },
          });
          if (!item) throw new ApiError(404, "PLAN_ITEM_NOT_FOUND", "That plan item was not found.");
          if (item.status === options.status) {
            let planStatus: PlanStatus = item.plan.status;
            if (
              planStatus === PlanStatus.ACTIVE &&
              isStudyPlanItemTerminal(item.status) &&
              (await completeStudyPlanIfTerminal(transaction, item.planId))
            ) {
              planStatus = PlanStatus.COMPLETED;
            }
            return {
              item: { id: item.id, status: item.status, completedAt: item.completedAt?.toISOString() ?? null },
              planStatus,
              replayed: true,
            };
          }
          if (item.plan.status !== PlanStatus.ACTIVE) {
            throw new ApiError(409, "PLAN_NOT_ACTIVE", "Archived or completed plans cannot be changed.");
          }
          if (!allowedTransitions[item.status].includes(options.status)) {
            throw new ApiError(409, "INVALID_PLAN_TRANSITION", `A ${item.status.toLowerCase()} item cannot move to ${options.status.toLowerCase()}.`);
          }

          if (options.status === PlanItemStatus.COMPLETED) {
            const verifiedSolve = await transaction.userProblemState.count({
              where: { userId: options.userId, problemId: item.problemId, solveCount: { gt: 0 } },
            });
            if (!verifiedSolve) {
              throw new ApiError(
                409,
                "ATTEMPT_REQUIRED",
                "Log a solved attempt before marking this item complete so mastery evidence stays trustworthy.",
              );
            }
          }

          const updated = await transaction.studyPlanItem.update({
            where: { id: item.id },
            data: {
              status: options.status,
              completedAt: options.status === PlanItemStatus.COMPLETED ? new Date() : null,
            },
          });
          let planStatus: PlanStatus = item.plan.status;
          if (
            isStudyPlanItemTerminal(options.status) &&
            (await completeStudyPlanIfTerminal(transaction, item.planId))
          ) {
            planStatus = PlanStatus.COMPLETED;
          }

          return {
            item: {
              id: updated.id,
              status: updated.status,
              completedAt: updated.completedAt?.toISOString() ?? null,
            },
            planStatus,
            replayed: false,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (attempt < 3 && isRetryableTransaction(error)) continue;
      throw error;
    }
  }

  throw new ApiError(409, "CONCURRENT_PLAN_UPDATE", "The plan changed concurrently. Please try again.");
}
