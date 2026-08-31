import { randomUUID } from "node:crypto";
import {
  AttemptOutcome,
  AttemptSource,
  ExperienceLevel,
  LearningGoal,
  Platform,
  PlatformStatus,
  PlanItemStatus,
  PlanStatus,
  PreferredLanguage,
  RecommendationEventType,
  RecommendationMode,
} from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api-response";
import { db } from "@/lib/db";
import { recordAttempt } from "@/lib/services/attempts";
import { getAnalytics } from "@/lib/services/analytics";
import { seedMasteryFromPlatform } from "@/lib/services/external-mastery";
import { commitPlatformSnapshot } from "@/lib/services/platform-sync";
import { getRecommendations, recordRecommendationEvent } from "@/lib/services/recommendations";

const createdUserIds: string[] = [];

async function createCompleteUser() {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 18);
  const handle = `it_${suffix}`;
  const topics = await db.topic.findMany({ orderBy: { sortOrder: "asc" } });
  if (topics.length < 3) throw new Error("The integration database must be migrated and seeded first.");

  const user = await db.user.create({
    data: {
      email: `${suffix}@integration.invalid`,
      emailVerified: new Date(),
      name: "Integration User",
      profile: {
        create: {
          handle,
          displayName: "Integration User",
          timezone: "UTC",
          targetRole: "Software Engineer",
          experienceLevel: ExperienceLevel.ADVANCED,
          learningGoal: LearningGoal.INTERVIEW_PREP,
          weeklyTarget: 7,
          minutesPerDay: 45,
          preferredLanguage: PreferredLanguage.PYTHON,
          onboardingCompletedAt: new Date(),
          isPublic: false,
        },
      },
    },
  });
  createdUserIds.push(user.id);

  await db.userTopicPreference.createMany({
    data: topics.slice(0, 8).map((topic, index) => ({
      userId: user.id,
      topicId: topic.id,
      priority: Math.max(0.55, 1 - index * 0.05),
      baselineConfidence: 3,
    })),
  });
  await db.userTopicMastery.createMany({
    data: topics.map((topic) => ({
      userId: user.id,
      topicId: topic.id,
      theta: 0.65,
      mastery: 1 / (1 + Math.exp(-0.65)),
      uncertainty: 1,
    })),
  });
  return { ...user, handle };
}

async function activeProblems(take = 2) {
  const problems = await db.problem.findMany({
    where: { isActive: true },
    orderBy: [{ difficultyB: "asc" }, { id: "asc" }],
    take,
  });
  if (problems.length < take) throw new Error("The integration database must be seeded first.");
  return problems;
}

function attemptInput(problemId: string, idempotencyKey: string, outcome = AttemptOutcome.SOLVED) {
  return {
    problemId,
    recommendationItemId: null,
    idempotencyKey,
    outcome,
    source: AttemptSource.IN_APP,
    startedAt: null,
    durationMinutes: 18,
    hintsUsed: 0,
    confidence: 4,
    language: PreferredLanguage.PYTHON,
    notes: null,
  };
}

describe.sequential("product database invariants", () => {
  beforeAll(async () => {
    await db.$queryRaw`SELECT 1`;
    const [topics, problems] = await Promise.all([
      db.topic.count(),
      db.problem.count({ where: { isActive: true } }),
    ]);
    if (topics < 3 || problems < 2) {
      throw new Error("Run database migrations and the catalog seed before integration tests.");
    }
  });

  afterEach(async () => {
    const ids = createdUserIds.splice(0);
    if (ids.length) await db.user.deleteMany({ where: { id: { in: ids } } });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("records one attempt under a concurrent idempotent replay and rejects payload reuse", async () => {
    const user = await createCompleteUser();
    const [problem] = await activeProblems(1);
    const input = attemptInput(problem.id, `attempt:${randomUUID()}`);

    const results = await Promise.all([
      recordAttempt({ userId: user.id, timezone: "UTC", experienceLevel: ExperienceLevel.ADVANCED, input }),
      recordAttempt({ userId: user.id, timezone: "UTC", experienceLevel: ExperienceLevel.ADVANCED, input }),
    ]);

    expect(await db.attempt.count({ where: { userId: user.id } })).toBe(1);
    expect(results.filter((result) => result.replayed)).toHaveLength(1);
    await expect(
      recordAttempt({
        userId: user.id,
        timezone: "UTC",
        experienceLevel: ExperienceLevel.ADVANCED,
        input: { ...input, outcome: AttemptOutcome.FAILED },
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED", status: 409 } satisfies Partial<ApiError>);
  });

  it("keys cached recommendations by context and removes dismissed problems from fresh slates", async () => {
    const user = await createCompleteUser();
    const base = {
      userId: user.id,
      experienceLevel: ExperienceLevel.ADVANCED,
      learningGoal: LearningGoal.INTERVIEW_PREP,
      targetDate: null,
      mode: RecommendationMode.DAILY,
      limit: 4,
      includePremium: false,
    };
    const first = await getRecommendations({ ...base, minutesAvailable: 45 });
    const replay = await getRecommendations({ ...base, minutesAvailable: 45 });
    const changedContext = await getRecommendations({ ...base, minutesAvailable: 60 });

    expect(first.items).toHaveLength(4);
    expect(replay).toMatchObject({ runId: first.runId, cached: true });
    expect(changedContext.cached).toBe(false);
    expect(changedContext.runId).not.toBe(first.runId);

    const dismissed = first.items[0];
    await recordRecommendationEvent({
      userId: user.id,
      itemId: dismissed.recommendationItemId,
      type: RecommendationEventType.DISMISSED,
      idempotencyKey: `dismiss:${randomUUID()}`,
    });
    const refreshed = await getRecommendations({
      ...base,
      minutesAvailable: 45,
      forceRefresh: true,
    });
    expect(refreshed.items.map((item) => item.problem.id)).not.toContain(dismissed.problem.id);

    const liveRuns = await db.recommendationRun.count({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
    });
    expect(liveRuns).toBe(1);
  });

  it("completes an active study plan only after every item has solved-attempt evidence", async () => {
    const user = await createCompleteUser();
    const problems = await activeProblems(2);
    const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
    const plan = await db.studyPlan.create({
      data: {
        userId: user.id,
        title: "Integration plan",
        status: PlanStatus.ACTIVE,
        startDate: today,
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1_000),
        minutesPerDay: 45,
        items: {
          create: problems.map((problem, index) => ({
            problemId: problem.id,
            scheduledFor: today,
            position: index,
            status: PlanItemStatus.TODO,
          })),
        },
      },
    });

    await recordAttempt({
      userId: user.id,
      timezone: "UTC",
      experienceLevel: ExperienceLevel.ADVANCED,
      input: attemptInput(problems[0].id, `plan:${randomUUID()}`),
    });
    expect(await db.studyPlan.findUniqueOrThrow({ where: { id: plan.id } })).toMatchObject({ status: PlanStatus.ACTIVE });

    await recordAttempt({
      userId: user.id,
      timezone: "UTC",
      experienceLevel: ExperienceLevel.ADVANCED,
      input: attemptInput(problems[1].id, `plan:${randomUUID()}`),
    });
    const completed = await db.studyPlan.findUniqueOrThrow({
      where: { id: plan.id },
      include: { items: true },
    });
    expect(completed.status).toBe(PlanStatus.COMPLETED);
    expect(completed.items.every((item) => item.status === PlanItemStatus.COMPLETED)).toBe(true);
  });

  it("surfaces imported platform stats and replaces untouched onboarding priors", async () => {
    const user = await createCompleteUser();
    const [arrays, hashing] = await Promise.all([
      db.topic.findUniqueOrThrow({ where: { slug: "arrays" } }),
      db.topic.findUniqueOrThrow({ where: { slug: "hashing" } }),
    ]);
    const priorTheta = -1.25;
    const priorMastery = 1 / (1 + Math.exp(-priorTheta));
    await db.userProfile.update({
      where: { userId: user.id },
      data: { experienceLevel: ExperienceLevel.BEGINNER },
    });
    await db.userTopicMastery.updateMany({
      where: { userId: user.id },
      data: { theta: priorTheta, mastery: priorMastery, uncertainty: 1, attemptCount: 0 },
    });
    await db.userTopicMastery.update({
      where: { userId_topicId: { userId: user.id, topicId: arrays.id } },
      data: { theta: 0.2, mastery: 1 / (1 + Math.exp(-0.2)), uncertainty: 0.4, attemptCount: 3 },
    });

    const identity = await db.platformIdentity.create({
      data: {
        userId: user.id,
        platform: Platform.LEETCODE,
        handle: "integration-handle",
        normalizedHandle: "integration-handle",
        profileUrl: "https://leetcode.com/u/integration-handle/",
        status: PlatformStatus.PENDING,
      },
    });
    const solvedByTag = [
      { tagSlug: "array", solved: 200 },
      { tagSlug: "hash-table", solved: 25 },
    ];
    const stats = {
      platform: Platform.LEETCODE,
      handle: "integration-handle",
      profileUrl: "https://leetcode.com/u/integration-handle/",
      totalSolved: 240,
      easySolved: 100,
      mediumSolved: 110,
      hardSolved: 30,
      rating: null,
      ranking: 12_345,
      reputation: 7,
      solvedByTag,
      raw: { totalSolved: 240, solvedByTag },
    };
    await commitPlatformSnapshot({
      identity: {
        id: identity.id,
        normalizedHandle: identity.normalizedHandle,
        updatedAt: identity.updatedAt,
      },
      stats,
      ttlSeconds: 900,
    });

    expect(await seedMasteryFromPlatform({ userId: user.id, platform: Platform.LEETCODE, stats })).toBe(1);
    const analytics = await getAnalytics(user.id, "UTC", 30);
    const arraysMastery = analytics.mastery.find((topic) => topic.slug === "arrays");
    const hashingMastery = analytics.mastery.find((topic) => topic.slug === "hashing");
    const priorTopic = analytics.mastery.find((topic) => topic.slug === "recursion");

    expect(analytics.mastery).toHaveLength(await db.topic.count());
    expect(arraysMastery).toMatchObject({ theta: 0.2, attempts: 3, evidence: "IN_APP" });
    expect(hashingMastery?.mastery).toBeGreaterThan(priorMastery);
    expect(hashingMastery?.evidence).toBe("PLATFORM");
    expect(priorTopic?.mastery).toBeCloseTo(priorMastery, 12);
    expect(priorTopic?.evidence).toBe("PRIOR");
    expect(analytics.integrations[0]?.stats).toMatchObject({
      totalSolved: 240,
      easySolved: 100,
      mediumSolved: 110,
      hardSolved: 30,
      ranking: 12_345,
      solvedByTag,
    });
  });

  it("refuses to commit stale platform stats after a handle changes", async () => {
    const user = await createCompleteUser();
    const identity = await db.platformIdentity.create({
      data: {
        userId: user.id,
        platform: Platform.LEETCODE,
        handle: "old-handle",
        normalizedHandle: "old-handle",
        profileUrl: "https://leetcode.com/u/old-handle/",
        status: PlatformStatus.PENDING,
      },
    });
    await db.platformIdentity.update({
      where: { id: identity.id },
      data: {
        handle: "new-handle",
        normalizedHandle: "new-handle",
        profileUrl: "https://leetcode.com/u/new-handle/",
      },
    });

    await expect(
      commitPlatformSnapshot({
        identity: {
          id: identity.id,
          normalizedHandle: identity.normalizedHandle,
          updatedAt: identity.updatedAt,
        },
        ttlSeconds: 900,
        stats: {
          platform: Platform.LEETCODE,
          handle: "old-handle",
          profileUrl: "https://leetcode.com/u/old-handle/",
          totalSolved: 100,
          easySolved: 40,
          mediumSolved: 40,
          hardSolved: 20,
          rating: null,
          ranking: 5000,
          reputation: 2,
          raw: { source: "integration-test" },
        },
      }),
    ).rejects.toMatchObject({ code: "SYNC_SUPERSEDED", status: 409 } satisfies Partial<ApiError>);

    expect(await db.platformSnapshot.count({ where: { identityId: identity.id } })).toBe(0);
    expect(await db.platformIdentity.findUniqueOrThrow({ where: { id: identity.id } })).toMatchObject({
      normalizedHandle: "new-handle",
      status: PlatformStatus.PENDING,
    });
  });
});
