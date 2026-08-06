-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "LearningGoal" AS ENUM ('INTERVIEW_PREP', 'COMPETITIVE_PROGRAMMING', 'CORE_FUNDAMENTALS', 'CAREER_SWITCH');

-- CreateEnum
CREATE TYPE "PreferredLanguage" AS ENUM ('CPP', 'JAVA', 'PYTHON', 'JAVASCRIPT', 'TYPESCRIPT', 'GO', 'RUST');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('LEETCODE', 'CODEFORCES');

-- CreateEnum
CREATE TYPE "PlatformStatus" AS ENUM ('PENDING', 'ACTIVE', 'ERROR', 'MANUAL_ONLY');

-- CreateEnum
CREATE TYPE "ProblemState" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SOLVED', 'REVIEW');

-- CreateEnum
CREATE TYPE "AttemptOutcome" AS ENUM ('SOLVED', 'PARTIAL', 'FAILED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "AttemptSource" AS ENUM ('IN_APP', 'MANUAL', 'IMPORT');

-- CreateEnum
CREATE TYPE "RecommendationMode" AS ENUM ('DAILY', 'LEARN', 'REVIEW', 'CHALLENGE');

-- CreateEnum
CREATE TYPE "RecommendationLane" AS ENUM ('LEARN', 'REVIEW', 'EXPLORE', 'CHALLENGE');

-- CreateEnum
CREATE TYPE "RecommendationEventType" AS ENUM ('IMPRESSION', 'OPENED', 'STARTED', 'DISMISSED', 'BOOKMARKED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PlanItemStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "userId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" VARCHAR(240),
    "timezone" TEXT NOT NULL,
    "currentRole" VARCHAR(80),
    "targetRole" VARCHAR(80) NOT NULL,
    "experienceLevel" "ExperienceLevel" NOT NULL,
    "learningGoal" "LearningGoal" NOT NULL,
    "weeklyTarget" INTEGER NOT NULL DEFAULT 7,
    "minutesPerDay" INTEGER NOT NULL DEFAULT 45,
    "preferredLanguage" "PreferredLanguage" NOT NULL DEFAULT 'PYTHON',
    "targetDate" DATE,
    "onboardingCompletedAt" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PlatformIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "handle" TEXT NOT NULL,
    "normalizedHandle" TEXT NOT NULL,
    "status" "PlatformStatus" NOT NULL DEFAULT 'PENDING',
    "profileUrl" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "nextSyncAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSnapshot" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalSolved" INTEGER NOT NULL DEFAULT 0,
    "easySolved" INTEGER,
    "mediumSolved" INTEGER,
    "hardSolved" INTEGER,
    "rating" INTEGER,
    "ranking" INTEGER,
    "reputation" INTEGER,
    "contestRating" INTEGER,
    "raw" JSONB,

    CONSTRAINT "PlatformSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" VARCHAR(240),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicPrerequisite" (
    "topicId" TEXT NOT NULL,
    "prerequisiteId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "TopicPrerequisite_pkey" PRIMARY KEY ("topicId","prerequisiteId")
);

-- CreateTable
CREATE TABLE "UserTopicPreference" (
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "priority" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "baselineConfidence" INTEGER NOT NULL DEFAULT 2,

    CONSTRAINT "UserTopicPreference_pkey" PRIMARY KEY ("userId","topicId")
);

-- CreateTable
CREATE TABLE "UserTopicMastery" (
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "theta" DOUBLE PRECISION NOT NULL DEFAULT -1.25,
    "mastery" DOUBLE PRECISION NOT NULL DEFAULT 0.22,
    "uncertainty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "effectiveSuccess" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPracticedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTopicMastery_pkey" PRIMARY KEY ("userId","topicId")
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "externalId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "difficultyB" DOUBLE PRECISION NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "acceptanceRate" DOUBLE PRECISION,
    "pattern" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "catalogVersion" TEXT NOT NULL DEFAULT '2026.1',
    "metadata" JSONB,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemTopic" (
    "problemId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProblemTopic_pkey" PRIMARY KEY ("problemId","topicId")
);

-- CreateTable
CREATE TABLE "UserProblemState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "state" "ProblemState" NOT NULL DEFAULT 'NOT_STARTED',
    "latestOutcome" "AttemptOutcome",
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "solveCount" INTEGER NOT NULL DEFAULT 0,
    "totalMinutes" INTEGER NOT NULL DEFAULT 0,
    "bestDurationMinutes" INTEGER,
    "confidence" INTEGER,
    "lastAttemptedAt" TIMESTAMP(3),
    "solvedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "fsrsCard" JSONB,
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "dismissedUntil" TIMESTAMP(3),
    "lastServedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProblemState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "recommendationItemId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "outcome" "AttemptOutcome" NOT NULL,
    "source" "AttemptSource" NOT NULL DEFAULT 'IN_APP',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMinutes" INTEGER NOT NULL,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "confidence" INTEGER NOT NULL,
    "language" "PreferredLanguage",
    "notes" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "RecommendationMode" NOT NULL DEFAULT 'DAILY',
    "modelVersion" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationItem" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "lane" "RecommendationLane" NOT NULL,
    "baseScore" DOUBLE PRECISION NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "predictedSolveProbability" DOUBLE PRECISION NOT NULL,
    "components" JSONB NOT NULL,
    "reasons" JSONB NOT NULL,
    "impressedAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "RecommendationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" "RecommendationEventType" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" VARCHAR(500),
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "minutesPerDay" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyPlanItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "scheduledFor" DATE NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "PlanItemStatus" NOT NULL DEFAULT 'TODO',
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "StudyPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "attempted" INTEGER NOT NULL DEFAULT 0,
    "solved" INTEGER NOT NULL DEFAULT 0,
    "reviewed" INTEGER NOT NULL DEFAULT 0,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expires_idx" ON "Session"("expires");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_handle_key" ON "UserProfile"("handle");

-- CreateIndex
CREATE INDEX "UserProfile_onboardingCompletedAt_idx" ON "UserProfile"("onboardingCompletedAt");

-- CreateIndex
CREATE INDEX "PlatformIdentity_userId_idx" ON "PlatformIdentity"("userId");

-- CreateIndex
CREATE INDEX "PlatformIdentity_status_nextSyncAt_idx" ON "PlatformIdentity"("status", "nextSyncAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformIdentity_userId_platform_key" ON "PlatformIdentity"("userId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformIdentity_platform_normalizedHandle_key" ON "PlatformIdentity"("platform", "normalizedHandle");

-- CreateIndex
CREATE INDEX "PlatformSnapshot_identityId_capturedAt_idx" ON "PlatformSnapshot"("identityId", "capturedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");

-- CreateIndex
CREATE INDEX "TopicPrerequisite_prerequisiteId_idx" ON "TopicPrerequisite"("prerequisiteId");

-- CreateIndex
CREATE INDEX "UserTopicPreference_topicId_idx" ON "UserTopicPreference"("topicId");

-- CreateIndex
CREATE INDEX "UserTopicMastery_userId_nextReviewAt_idx" ON "UserTopicMastery"("userId", "nextReviewAt");

-- CreateIndex
CREATE INDEX "UserTopicMastery_topicId_idx" ON "UserTopicMastery"("topicId");

-- CreateIndex
CREATE UNIQUE INDEX "Problem_slug_key" ON "Problem"("slug");

-- CreateIndex
CREATE INDEX "Problem_isActive_difficultyB_idx" ON "Problem"("isActive", "difficultyB");

-- CreateIndex
CREATE INDEX "Problem_difficulty_isActive_idx" ON "Problem"("difficulty", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Problem_platform_externalId_key" ON "Problem"("platform", "externalId");

-- CreateIndex
CREATE INDEX "ProblemTopic_topicId_problemId_idx" ON "ProblemTopic"("topicId", "problemId");

-- CreateIndex
CREATE INDEX "UserProblemState_userId_state_nextReviewAt_idx" ON "UserProblemState"("userId", "state", "nextReviewAt");

-- CreateIndex
CREATE INDEX "UserProblemState_userId_dismissedUntil_idx" ON "UserProblemState"("userId", "dismissedUntil");

-- CreateIndex
CREATE INDEX "UserProblemState_problemId_idx" ON "UserProblemState"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProblemState_userId_problemId_key" ON "UserProblemState"("userId", "problemId");

-- CreateIndex
CREATE INDEX "Attempt_userId_completedAt_idx" ON "Attempt"("userId", "completedAt" DESC);

-- CreateIndex
CREATE INDEX "Attempt_userId_problemId_completedAt_idx" ON "Attempt"("userId", "problemId", "completedAt" DESC);

-- CreateIndex
CREATE INDEX "Attempt_problemId_idx" ON "Attempt"("problemId");

-- CreateIndex
CREATE INDEX "Attempt_recommendationItemId_idx" ON "Attempt"("recommendationItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_userId_idempotencyKey_key" ON "Attempt"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "RecommendationRun_userId_mode_createdAt_idx" ON "RecommendationRun"("userId", "mode", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "RecommendationRun_expiresAt_idx" ON "RecommendationRun"("expiresAt");

-- CreateIndex
CREATE INDEX "RecommendationItem_problemId_idx" ON "RecommendationItem"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationItem_runId_problemId_key" ON "RecommendationItem"("runId", "problemId");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationItem_runId_rank_key" ON "RecommendationItem"("runId", "rank");

-- CreateIndex
CREATE INDEX "RecommendationEvent_itemId_createdAt_idx" ON "RecommendationEvent"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendationEvent_userId_createdAt_idx" ON "RecommendationEvent"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationEvent_userId_idempotencyKey_key" ON "RecommendationEvent"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "StudyPlan_userId_status_idx" ON "StudyPlan"("userId", "status");

-- CreateIndex
CREATE INDEX "StudyPlan_userId_startDate_endDate_idx" ON "StudyPlan"("userId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "StudyPlanItem_planId_scheduledFor_idx" ON "StudyPlanItem"("planId", "scheduledFor");

-- CreateIndex
CREATE INDEX "StudyPlanItem_problemId_idx" ON "StudyPlanItem"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "StudyPlanItem_planId_problemId_key" ON "StudyPlanItem"("planId", "problemId");

-- CreateIndex
CREATE UNIQUE INDEX "StudyPlanItem_planId_scheduledFor_position_key" ON "StudyPlanItem"("planId", "scheduledFor", "position");

-- CreateIndex
CREATE INDEX "DailyActivity_userId_day_idx" ON "DailyActivity"("userId", "day" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "DailyActivity_userId_day_key" ON "DailyActivity"("userId", "day");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformIdentity" ADD CONSTRAINT "PlatformIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformSnapshot" ADD CONSTRAINT "PlatformSnapshot_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "PlatformIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicPrerequisite" ADD CONSTRAINT "TopicPrerequisite_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicPrerequisite" ADD CONSTRAINT "TopicPrerequisite_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTopicPreference" ADD CONSTRAINT "UserTopicPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTopicPreference" ADD CONSTRAINT "UserTopicPreference_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTopicMastery" ADD CONSTRAINT "UserTopicMastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTopicMastery" ADD CONSTRAINT "UserTopicMastery_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTopic" ADD CONSTRAINT "ProblemTopic_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTopic" ADD CONSTRAINT "ProblemTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProblemState" ADD CONSTRAINT "UserProblemState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProblemState" ADD CONSTRAINT "UserProblemState_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_recommendationItemId_fkey" FOREIGN KEY ("recommendationItemId") REFERENCES "RecommendationItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationRun" ADD CONSTRAINT "RecommendationRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationItem" ADD CONSTRAINT "RecommendationItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "RecommendationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationItem" ADD CONSTRAINT "RecommendationItem_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationEvent" ADD CONSTRAINT "RecommendationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationEvent" ADD CONSTRAINT "RecommendationEvent_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "RecommendationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlan" ADD CONSTRAINT "StudyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlanItem" ADD CONSTRAINT "StudyPlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "StudyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlanItem" ADD CONSTRAINT "StudyPlanItem_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyActivity" ADD CONSTRAINT "DailyActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
