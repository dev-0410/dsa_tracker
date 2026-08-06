import "server-only";

import {
  AttemptOutcome,
  AttemptSource,
  PlanItemStatus,
  PlanStatus,
  PreferredLanguage,
  Prisma,
  ProblemState,
  RecommendationEventType,
} from "@prisma/client";
import { ApiError } from "@/lib/api-response";
import { db } from "@/lib/db";
import { mapAttemptToReviewRating, updateTopicMastery } from "@/lib/recommendation";
import { scheduleNextReview } from "@/lib/review-scheduler";
import type { AttemptInput } from "@/lib/validation";

const problemInclude = {
  topics: { include: { topic: true }, orderBy: { weight: "desc" } },
} satisfies Prisma.ProblemInclude;

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

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

function attemptPoints(outcome: AttemptOutcome, difficulty: "EASY" | "MEDIUM" | "HARD", isReview: boolean) {
  if (outcome !== AttemptOutcome.SOLVED) return outcome === AttemptOutcome.PARTIAL ? 2 : 1;
  const base = { EASY: 8, MEDIUM: 12, HARD: 18 }[difficulty];
  return base + (isReview ? 3 : 0);
}

function isRetryableTransaction(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

function sameInstant(left: Date | null, right: Date | null | undefined) {
  return left?.getTime() === right?.getTime();
}

function assertMatchingReplay(
  existing: {
    problemId: string;
    recommendationItemId: string | null;
    outcome: AttemptOutcome;
    source: AttemptSource;
    startedAt: Date | null;
    durationMinutes: number;
    hintsUsed: number;
    confidence: number;
    language: PreferredLanguage | null;
    notes: string | null;
  },
  input: AttemptInput,
) {
  const matches =
    existing.problemId === input.problemId &&
    existing.recommendationItemId === (input.recommendationItemId ?? null) &&
    existing.outcome === input.outcome &&
    existing.source === input.source &&
    sameInstant(existing.startedAt, input.startedAt ?? null) &&
    existing.durationMinutes === input.durationMinutes &&
    existing.hintsUsed === input.hintsUsed &&
    existing.confidence === input.confidence &&
    existing.language === (input.language ?? null) &&
    existing.notes === (input.notes ?? null);
  if (!matches) {
    throw new ApiError(
      409,
      "IDEMPOTENCY_KEY_REUSED",
      "That idempotency key was already used for a different attempt payload.",
    );
  }
}

export async function recordAttempt(options: {
  userId: string;
  timezone: string;
  experienceLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  input: AttemptInput;
}) {
  const existing = await db.attempt.findUnique({
    where: { userId_idempotencyKey: { userId: options.userId, idempotencyKey: options.input.idempotencyKey } },
    include: { problem: { include: problemInclude } },
  });
  if (existing) {
    assertMatchingReplay(existing, options.input);
    return { attempt: existing, replayed: true, masteryDeltas: [], review: null };
  }

  const problem = await db.problem.findUnique({
    where: { id: options.input.problemId },
    include: problemInclude,
  });
  if (!problem?.isActive) throw new ApiError(404, "PROBLEM_NOT_FOUND", "That catalog problem is unavailable.");

  if (options.input.recommendationItemId) {
    const owned = await db.recommendationItem.count({
      where: { id: options.input.recommendationItemId, problemId: problem.id, run: { userId: options.userId } },
    });
    if (!owned) throw new ApiError(404, "RECOMMENDATION_NOT_FOUND", "That recommendation does not belong to this account.");
  }

  for (let attemptNumber = 1; attemptNumber <= 3; attemptNumber += 1) {
    try {
      return await db.$transaction(
        async (transaction) => {
          const duplicate = await transaction.attempt.findUnique({
            where: { userId_idempotencyKey: { userId: options.userId, idempotencyKey: options.input.idempotencyKey } },
            include: { problem: { include: problemInclude } },
          });
          if (duplicate) {
            assertMatchingReplay(duplicate, options.input);
            return { attempt: duplicate, replayed: true, masteryDeltas: [], review: null };
          }

          const [state, currentMastery] = await Promise.all([
            transaction.userProblemState.findUnique({
              where: { userId_problemId: { userId: options.userId, problemId: problem.id } },
            }),
            transaction.userTopicMastery.findMany({
              where: { userId: options.userId, topicId: { in: problem.topics.map((link) => link.topicId) } },
            }),
          ]);

          const recommendationProblem = {
            id: problem.id,
            title: problem.title,
            source: problem.platform,
            url: problem.url,
            difficulty: problem.difficulty,
            difficultyB: problem.difficultyB,
            estimatedMinutes: problem.estimatedMinutes,
            qualityScore: problem.qualityScore,
            pattern: problem.pattern,
            isActive: problem.isActive,
            isPremium: problem.isPremium,
            topics: problem.topics.map((link) => ({
              topicId: link.topicId,
              topicName: link.topic.name,
              weight: link.weight,
              isPrimary: link.isPrimary,
            })),
          };
          const masteryUpdate = updateTopicMastery({
            problem: recommendationProblem,
            currentMastery: currentMastery.map((item) => ({
              topicId: item.topicId,
              theta: item.theta,
              attemptCount: item.attemptCount,
              effectiveSuccesses: item.effectiveSuccess,
              uncertainty: item.uncertainty,
              lastPracticedAt: item.lastPracticedAt,
            })),
            attempt: {
              outcome: options.input.outcome,
              durationMinutes: options.input.durationMinutes,
              hintsUsed: options.input.hintsUsed,
              confidence: options.input.confidence,
            },
            experienceLevel: options.experienceLevel,
          });
          const reviewRating = mapAttemptToReviewRating(recommendationProblem, {
            outcome: options.input.outcome,
            durationMinutes: options.input.durationMinutes,
            hintsUsed: options.input.hintsUsed,
            confidence: options.input.confidence,
          });
          const completedAt = new Date();
          const review = scheduleNextReview(state?.fsrsCard, reviewRating, completedAt);
          const outcome = AttemptOutcome[options.input.outcome];
          const solved = outcome === AttemptOutcome.SOLVED;
          const wasReview = (state?.solveCount ?? 0) > 0;

          const createdAttempt = await transaction.attempt.create({
            data: {
              userId: options.userId,
              problemId: problem.id,
              recommendationItemId: options.input.recommendationItemId ?? null,
              idempotencyKey: options.input.idempotencyKey,
              outcome,
              source: AttemptSource[options.input.source],
              startedAt: options.input.startedAt ?? null,
              completedAt,
              durationMinutes: options.input.durationMinutes,
              hintsUsed: options.input.hintsUsed,
              confidence: options.input.confidence,
              language: options.input.language ? PreferredLanguage[options.input.language] : null,
              notes: options.input.notes ?? null,
            },
            include: { problem: { include: problemInclude } },
          });

          await transaction.userProblemState.upsert({
            where: { userId_problemId: { userId: options.userId, problemId: problem.id } },
            create: {
              userId: options.userId,
              problemId: problem.id,
              state: solved ? ProblemState.SOLVED : ProblemState.IN_PROGRESS,
              latestOutcome: outcome,
              attemptCount: 1,
              solveCount: solved ? 1 : 0,
              totalMinutes: options.input.durationMinutes,
              bestDurationMinutes: solved ? options.input.durationMinutes : null,
              confidence: options.input.confidence,
              lastAttemptedAt: completedAt,
              solvedAt: solved ? completedAt : null,
              nextReviewAt: review.dueAt,
              fsrsCard: asJson(review.card),
            },
            update: {
              state: solved ? ProblemState.SOLVED : wasReview ? ProblemState.REVIEW : ProblemState.IN_PROGRESS,
              latestOutcome: outcome,
              attemptCount: { increment: 1 },
              solveCount: solved ? { increment: 1 } : undefined,
              totalMinutes: { increment: options.input.durationMinutes },
              bestDurationMinutes: solved
                ? Math.min(state?.bestDurationMinutes ?? Number.MAX_SAFE_INTEGER, options.input.durationMinutes)
                : state?.bestDurationMinutes,
              confidence: options.input.confidence,
              lastAttemptedAt: completedAt,
              solvedAt: solved ? state?.solvedAt ?? completedAt : state?.solvedAt,
              nextReviewAt: review.dueAt,
              fsrsCard: asJson(review.card),
            },
          });

          for (const delta of masteryUpdate.topics) {
            await transaction.userTopicMastery.upsert({
              where: { userId_topicId: { userId: options.userId, topicId: delta.topicId } },
              create: {
                userId: options.userId,
                topicId: delta.topicId,
                theta: delta.afterTheta,
                mastery: delta.afterMastery,
                uncertainty: delta.uncertainty,
                attemptCount: delta.attemptCount,
                effectiveSuccess: delta.effectiveSuccesses,
                lastPracticedAt: completedAt,
                nextReviewAt: review.dueAt,
              },
              update: {
                theta: delta.afterTheta,
                mastery: delta.afterMastery,
                uncertainty: delta.uncertainty,
                attemptCount: delta.attemptCount,
                effectiveSuccess: delta.effectiveSuccesses,
                lastPracticedAt: completedAt,
                nextReviewAt: review.dueAt,
              },
            });
          }

          await transaction.dailyActivity.upsert({
            where: { userId_day: { userId: options.userId, day: localDay(completedAt, options.timezone) } },
            create: {
              userId: options.userId,
              day: localDay(completedAt, options.timezone),
              attempted: 1,
              solved: solved ? 1 : 0,
              reviewed: solved && wasReview ? 1 : 0,
              minutes: options.input.durationMinutes,
              points: attemptPoints(outcome, problem.difficulty, wasReview),
            },
            update: {
              attempted: { increment: 1 },
              solved: solved ? { increment: 1 } : undefined,
              reviewed: solved && wasReview ? { increment: 1 } : undefined,
              minutes: { increment: options.input.durationMinutes },
              points: { increment: attemptPoints(outcome, problem.difficulty, wasReview) },
            },
          });

          if (options.input.recommendationItemId) {
            await transaction.recommendationItem.update({
              where: { id: options.input.recommendationItemId },
              data: { startedAt: options.input.startedAt ?? completedAt, ...(solved ? { completedAt } : {}) },
            });
            if (solved) {
              await transaction.recommendationEvent.create({
                data: {
                  userId: options.userId,
                  itemId: options.input.recommendationItemId,
                  type: RecommendationEventType.COMPLETED,
                  idempotencyKey: `attempt:${options.input.idempotencyKey}`,
                },
              });
            }
          }

          await transaction.studyPlanItem.updateMany({
            where: { problemId: problem.id, plan: { userId: options.userId, status: "ACTIVE" } },
            data: solved ? { status: PlanItemStatus.COMPLETED, completedAt } : { status: PlanItemStatus.IN_PROGRESS },
          });
          if (solved) {
            await transaction.studyPlan.updateMany({
              where: {
                userId: options.userId,
                status: PlanStatus.ACTIVE,
                items: {
                  some: {},
                  every: { status: { in: [PlanItemStatus.COMPLETED, PlanItemStatus.SKIPPED] } },
                },
              },
              data: { status: PlanStatus.COMPLETED },
            });
          }

          // Any fresh outcome changes mastery and eligibility, so cached slates
          // must not survive the transaction that records it.
          await transaction.recommendationRun.updateMany({
            where: { userId: options.userId, expiresAt: { gt: new Date() } },
            data: { expiresAt: new Date() },
          });

          return {
            attempt: createdAttempt,
            replayed: false,
            masteryDeltas: masteryUpdate.topics,
            effectiveOutcome: masteryUpdate.effectiveOutcome,
            predictedSolveProbability: masteryUpdate.predictedSolveProbability,
            review: { dueAt: review.dueAt, scheduledDays: review.scheduledDays, rating: review.rating },
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const replayed = await db.attempt.findUnique({
          where: { userId_idempotencyKey: { userId: options.userId, idempotencyKey: options.input.idempotencyKey } },
          include: { problem: { include: problemInclude } },
        });
        if (replayed) {
          assertMatchingReplay(replayed, options.input);
          return { attempt: replayed, replayed: true, masteryDeltas: [], review: null };
        }
      }
      if (attemptNumber < 3 && isRetryableTransaction(error)) continue;
      throw error;
    }
  }

  throw new ApiError(409, "CONCURRENT_UPDATE", "The attempt could not be recorded. Please try again.");
}
