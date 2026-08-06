import "server-only";

import {
  Prisma,
  RecommendationEventType,
  RecommendationLane,
  RecommendationMode,
  type ExperienceLevel,
  type LearningGoal,
} from "@prisma/client";
import { ApiError } from "@/lib/api-response";
import { db } from "@/lib/db";
import {
  generateRecommendations,
  type RecommendationInput,
  type RankedRecommendation,
  type TopicBehaviorSignal,
} from "@/lib/recommendation";

const problemInclude = {
  topics: {
    include: {
      topic: {
        include: { prerequisites: true },
      },
    },
    orderBy: { weight: "desc" },
  },
} satisfies Prisma.ProblemInclude;

const recommendationItemInclude = {
  problem: { include: problemInclude },
} satisfies Prisma.RecommendationItemInclude;

type ProblemWithTopics = Prisma.ProblemGetPayload<{ include: typeof problemInclude }>;
type StoredItem = Prisma.RecommendationItemGetPayload<{ include: typeof recommendationItemInclude }>;

type StoredReason = {
  code: string;
  label: string;
  component?: string;
  value?: number;
  contribution?: number;
};

type GetRecommendationsOptions = {
  userId: string;
  experienceLevel: ExperienceLevel;
  mode: RecommendationMode;
  limit: number;
  minutesAvailable?: number;
  includePremium?: boolean;
  forceRefresh?: boolean;
  /** Stable caller-provided seed for deterministic derived artifacts such as plans. */
  seedOverride?: string;
  /** Separates visible feeds from recommendation-derived planning artifacts. */
  purpose?: "FEED" | "PLAN";
  learningGoal?: LearningGoal;
  targetDate?: Date | null;
};

const GOAL_PROFILES: Record<
  LearningGoal,
  { targetMastery: number; dailySolveTarget: number; challengeSolveTarget: number }
> = {
  INTERVIEW_PREP: { targetMastery: 0.8, dailySolveTarget: 0.65, challengeSolveTarget: 0.45 },
  COMPETITIVE_PROGRAMMING: { targetMastery: 0.82, dailySolveTarget: 0.58, challengeSolveTarget: 0.4 },
  CORE_FUNDAMENTALS: { targetMastery: 0.85, dailySolveTarget: 0.72, challengeSolveTarget: 0.5 },
  CAREER_SWITCH: { targetMastery: 0.78, dailySolveTarget: 0.68, challengeSolveTarget: 0.47 },
};

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function candidateFrom(problem: ProblemWithTopics): RecommendationInput["candidates"][number] {
  const primaryTopic = problem.topics.find((link) => link.isPrimary) ?? problem.topics[0];
  return {
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
    prerequisiteTopicIds: primaryTopic?.topic.prerequisites.map((edge) => edge.prerequisiteId) ?? [],
  };
}

function behaviorSignals(
  items: Array<
    Prisma.RecommendationItemGetPayload<{
      include: { problem: { include: { topics: true } } };
    }>
  >,
): TopicBehaviorSignal[] {
  const byTopic = new Map<string, TopicBehaviorSignal>();
  for (const item of items) {
    for (const link of item.problem.topics) {
      const signal = byTopic.get(link.topicId) ?? {
        topicId: link.topicId,
        impressions: 0,
        starts: 0,
        completions: 0,
        dismissals: 0,
      };
      if (item.impressedAt) signal.impressions += 1;
      if (item.startedAt) signal.starts += 1;
      if (item.completedAt) signal.completions += 1;
      if (item.dismissedAt) signal.dismissals += 1;
      byTopic.set(link.topicId, signal);
    }
  }
  return [...byTopic.values()];
}

function scheduledDays(fsrsCard: Prisma.JsonValue | null) {
  if (!fsrsCard || typeof fsrsCard !== "object" || Array.isArray(fsrsCard)) return null;
  const value = (fsrsCard as Record<string, Prisma.JsonValue>).scheduled_days;
  return typeof value === "number" ? value : null;
}

function explanationHeadline(item: RankedRecommendation) {
  if (item.lane === "REVIEW") return "Strengthen this before it fades";
  if (item.lane === "EXPLORE") return "Calibrate an under-explored skill";
  if (item.lane === "CHALLENGE") return "Stretch just beyond your current level";
  const need = item.reasons.find((reason) => reason.code === "MASTERY_GAP");
  return need ? "Close a high-value mastery gap" : "A strong fit for today’s session";
}

function isStoredReason(value: Prisma.JsonValue): value is Prisma.JsonObject & StoredReason {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof value.code === "string" &&
      typeof value.label === "string",
  );
}

export function presentRecommendationItem(item: StoredItem) {
  const reasons: StoredReason[] = Array.isArray(item.reasons) ? item.reasons.filter(isStoredReason) : [];
  const topics = item.problem.topics
    .slice()
    .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary) || right.weight - left.weight)
    .map((link) => ({ id: link.topic.id, slug: link.topic.slug, name: link.topic.name }));
  return {
    recommendationItemId: item.id,
    rank: item.rank,
    lane: item.lane,
    score: item.finalScore,
    matchPercent: Math.round(Math.max(0, Math.min(1, item.finalScore)) * 100),
    predictedSolveProbability: item.predictedSolveProbability,
    problem: {
      id: item.problem.id,
      title: item.problem.title,
      platform: item.problem.platform,
      url: item.problem.url,
      difficulty: item.problem.difficulty,
      estimatedMinutes: item.problem.estimatedMinutes,
      pattern: item.problem.pattern,
      topics,
    },
    explanation: {
      headline:
        item.lane === RecommendationLane.REVIEW
          ? "Strengthen this before it fades"
          : item.lane === RecommendationLane.EXPLORE
            ? "Calibrate an under-explored skill"
            : item.lane === RecommendationLane.CHALLENGE
              ? "Stretch just beyond your current level"
              : "Close a high-value mastery gap",
      reasons,
      components: item.components,
    },
  };
}

async function loadExisting(options: GetRecommendationsOptions) {
  if (options.forceRefresh || options.purpose === "PLAN") return null;
  const run = await db.recommendationRun.findFirst({
    where: {
      userId: options.userId,
      mode: options.mode,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: recommendationItemInclude,
        orderBy: { rank: "asc" },
        take: options.limit,
      },
    },
  });
  if (!run || run.items.length < Math.min(options.limit, 1)) return null;

  const context = run.context;
  if (!context || typeof context !== "object" || Array.isArray(context)) return null;
  const stored = context as Record<string, Prisma.JsonValue>;
  const requestedMinutes = options.minutesAvailable ?? null;
  const learningGoal = options.learningGoal ?? "INTERVIEW_PREP";
  const targetDate = options.targetDate?.toISOString().slice(0, 10) ?? null;
  const storedLimit = typeof stored.limit === "number" ? stored.limit : 0;
  if (
    storedLimit < options.limit ||
    (stored.minutesAvailable ?? null) !== requestedMinutes ||
    stored.includePremium !== Boolean(options.includePremium) ||
    stored.experienceLevel !== options.experienceLevel ||
    stored.purpose !== "FEED" ||
    stored.learningGoal !== learningGoal ||
    (stored.targetDate ?? null) !== targetDate
  ) {
    return null;
  }
  return run;
}

export async function getRecommendations(options: GetRecommendationsOptions) {
  const existing = await loadExisting(options);
  if (existing) {
    const existingContext =
      existing.context && typeof existing.context === "object" && !Array.isArray(existing.context)
        ? (existing.context as Prisma.JsonObject)
        : null;
    return {
      runId: existing.id,
      algorithmVersion: existing.modelVersion,
      generatedAt: existing.createdAt,
      expiresAt: existing.expiresAt,
      items: existing.items.map(presentRecommendationItem),
      diagnostics: existingContext?.diagnostics ?? null,
      cached: true,
    };
  }

  const [problems, mastery, goals, states, recentItems] = await Promise.all([
    db.problem.findMany({ where: { isActive: true }, include: problemInclude }),
    db.userTopicMastery.findMany({ where: { userId: options.userId } }),
    db.userTopicPreference.findMany({ where: { userId: options.userId } }),
    db.userProblemState.findMany({ where: { userId: options.userId } }),
    db.recommendationItem.findMany({
      where: {
        run: { userId: options.userId, createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1_000) } },
      },
      include: { problem: { include: { topics: true } } },
      orderBy: { run: { createdAt: "desc" } },
      take: 1_000,
    }),
  ]);
  if (!problems.length) {
    throw new ApiError(503, "CATALOG_EMPTY", "The practice catalog has not been seeded yet.");
  }

  const now = new Date();
  const learningGoal = options.learningGoal ?? "INTERVIEW_PREP";
  const goalProfile = GOAL_PROFILES[learningGoal];
  const daysUntilTarget = options.targetDate
    ? Math.ceil((options.targetDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1_000))
    : null;
  const deadlineIsClose = daysUntilTarget !== null && daysUntilTarget >= 0 && daysUntilTarget <= 45;
  const targetMastery = Math.min(0.92, goalProfile.targetMastery + (deadlineIsClose ? 0.04 : 0));
  const seed =
    options.seedOverride ??
    `${options.userId}:${options.mode}:${now.toISOString().slice(0, 10)}:${options.forceRefresh ? now.getTime() : "stable"}`;
  const input: RecommendationInput = {
    candidates: problems.map(candidateFrom),
    topicMastery: mastery.map((item) => ({
      topicId: item.topicId,
      theta: item.theta,
      attemptCount: item.attemptCount,
      effectiveSuccesses: item.effectiveSuccess,
      uncertainty: item.uncertainty,
      lastPracticedAt: item.lastPracticedAt,
    })),
    topicGoals: goals.map((goal) => ({ topicId: goal.topicId, priority: goal.priority, targetMastery })),
    topicBehavior: behaviorSignals(recentItems),
    problemStates: states.map((state) => ({
      problemId: state.problemId,
      attemptCount: state.attemptCount,
      solveCount: state.solveCount,
      solved: state.solveCount > 0,
      lastOutcome: state.latestOutcome,
      dueAt: state.nextReviewAt,
      scheduledDays: scheduledDays(state.fsrsCard),
      dismissedUntil: state.dismissedUntil,
      lastServedAt: state.lastServedAt,
    })),
    context: {
      mode: options.mode,
      limit: options.limit,
      now,
      seed,
      experienceLevel: options.experienceLevel,
      minutesAvailable: options.minutesAvailable,
      includePremium: options.includePremium,
    },
    config: {
      difficultyTargets: {
        DAILY: goalProfile.dailySolveTarget + (deadlineIsClose ? 0.03 : 0),
        LEARN: goalProfile.dailySolveTarget + (deadlineIsClose ? 0.03 : 0),
        CHALLENGE: goalProfile.challengeSolveTarget,
      },
      ...(deadlineIsClose ? { normalReviewShare: 0.45, backlogReviewShare: 0.6 } : {}),
    },
  };

  const generated = generateRecommendations(input);
  if (!generated.items.length) {
    return {
      runId: null,
      algorithmVersion: generated.algorithmVersion,
      generatedAt: new Date(generated.generatedAt),
      expiresAt: null,
      items: [],
      diagnostics: generated.diagnostics,
      cached: false,
    };
  }
  const expiresAt = new Date(now.getTime() + (options.mode === RecommendationMode.DAILY ? 12 : 2) * 60 * 60 * 1_000);

  const run = await db.$transaction(async (transaction) => {
    const created = await transaction.recommendationRun.create({
      data: {
        userId: options.userId,
        mode: options.mode,
        modelVersion: generated.algorithmVersion,
        seed,
        context: jsonValue({
          mode: options.mode,
          limit: options.limit,
          minutesAvailable: options.minutesAvailable ?? null,
          includePremium: Boolean(options.includePremium),
          experienceLevel: options.experienceLevel,
          purpose: options.purpose ?? "FEED",
          learningGoal,
          targetDate: options.targetDate?.toISOString().slice(0, 10) ?? null,
          deadlineIsClose,
          diagnostics: generated.diagnostics,
        }),
        expiresAt,
        items: {
          create: generated.items.map((item) => ({
            problemId: item.problem.id,
            rank: item.rank,
            lane: item.lane,
            baseScore: item.baseScore,
            finalScore: item.finalScore,
            predictedSolveProbability: item.predictedSolveProbability,
            components: jsonValue(item.components),
            reasons: jsonValue(item.reasons),
          })),
        },
      },
      include: { items: { include: recommendationItemInclude, orderBy: { rank: "asc" } } },
    });

    if ((options.purpose ?? "FEED") === "FEED") {
      for (const item of generated.items) {
        await transaction.userProblemState.upsert({
          where: { userId_problemId: { userId: options.userId, problemId: item.problem.id } },
          create: { userId: options.userId, problemId: item.problem.id, lastServedAt: now },
          update: { lastServedAt: now },
        });
      }
    }
    return created;
  });

  return {
    runId: run.id,
    algorithmVersion: run.modelVersion,
    generatedAt: run.createdAt,
    expiresAt: run.expiresAt,
    items: run.items.map((item) => ({
      ...presentRecommendationItem(item),
      explanation: {
        ...presentRecommendationItem(item).explanation,
        headline: explanationHeadline(generated.items.find((generatedItem) => generatedItem.problem.id === item.problemId)!),
      },
    })),
    diagnostics: generated.diagnostics,
    cached: false,
  };
}

export type PresentedRecommendation = ReturnType<typeof presentRecommendationItem>;

export async function recordRecommendationEvent(options: {
  userId: string;
  itemId: string;
  type: RecommendationEventType;
  idempotencyKey: string;
}) {
  if (options.type === RecommendationEventType.COMPLETED) {
    throw new ApiError(
      422,
      "ATTEMPT_REQUIRED",
      "Completion events are created only from a verified solved attempt.",
    );
  }
  const item = await db.recommendationItem.findFirst({
    where: { id: options.itemId, run: { userId: options.userId } },
    select: { id: true, problemId: true, runId: true },
  });
  if (!item) throw new ApiError(404, "RECOMMENDATION_NOT_FOUND", "That recommendation no longer exists.");

  const existing = await db.recommendationEvent.findUnique({
    where: { userId_idempotencyKey: { userId: options.userId, idempotencyKey: options.idempotencyKey } },
  });
  if (existing) {
    if (existing.itemId !== options.itemId || existing.type !== options.type) {
      throw new ApiError(
        409,
        "IDEMPOTENCY_KEY_REUSED",
        "That idempotency key was already used for a different recommendation event.",
      );
    }
    return { event: existing, replayed: true };
  }

  const now = new Date();
  const timestampField = {
    IMPRESSION: "impressedAt",
    OPENED: "openedAt",
    STARTED: "startedAt",
    DISMISSED: "dismissedAt",
    BOOKMARKED: null,
    COMPLETED: "completedAt",
  }[options.type] as "impressedAt" | "openedAt" | "startedAt" | "dismissedAt" | "completedAt" | null;

  try {
    const event = await db.$transaction(async (transaction) => {
      const created = await transaction.recommendationEvent.create({
        data: options,
      });
      if (timestampField) {
        await transaction.recommendationItem.update({ where: { id: item.id }, data: { [timestampField]: now } });
      }
      if (options.type === RecommendationEventType.DISMISSED) {
        await transaction.userProblemState.upsert({
          where: { userId_problemId: { userId: options.userId, problemId: item.problemId } },
          create: {
            userId: options.userId,
            problemId: item.problemId,
            dismissedUntil: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1_000),
          },
          update: { dismissedUntil: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1_000) },
        });
        await transaction.recommendationRun.updateMany({
          where: { userId: options.userId, expiresAt: { gt: now } },
          data: { expiresAt: now },
        });
      }
      if (options.type === RecommendationEventType.BOOKMARKED) {
        await transaction.userProblemState.upsert({
          where: { userId_problemId: { userId: options.userId, problemId: item.problemId } },
          create: { userId: options.userId, problemId: item.problemId, bookmarked: true },
          update: { bookmarked: true },
        });
      }
      return created;
    });
    return { event, replayed: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const replayed = await db.recommendationEvent.findUnique({
        where: { userId_idempotencyKey: { userId: options.userId, idempotencyKey: options.idempotencyKey } },
      });
      if (replayed) {
        if (replayed.itemId !== options.itemId || replayed.type !== options.type) {
          throw new ApiError(
            409,
            "IDEMPOTENCY_KEY_REUSED",
            "That idempotency key was already used for a different recommendation event.",
          );
        }
        return { event: replayed, replayed: true };
      }
    }
    throw error;
  }
}
