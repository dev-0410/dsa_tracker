-- DropForeignKey
ALTER TABLE "Attempt" DROP CONSTRAINT "Attempt_problemId_fkey";

-- DropForeignKey
ALTER TABLE "ProblemTopic" DROP CONSTRAINT "ProblemTopic_topicId_fkey";

-- DropForeignKey
ALTER TABLE "RecommendationItem" DROP CONSTRAINT "RecommendationItem_problemId_fkey";

-- DropForeignKey
ALTER TABLE "StudyPlanItem" DROP CONSTRAINT "StudyPlanItem_problemId_fkey";

-- DropForeignKey
ALTER TABLE "UserProblemState" DROP CONSTRAINT "UserProblemState_problemId_fkey";

-- DropForeignKey
ALTER TABLE "UserTopicMastery" DROP CONSTRAINT "UserTopicMastery_topicId_fkey";

-- DropForeignKey
ALTER TABLE "UserTopicPreference" DROP CONSTRAINT "UserTopicPreference_topicId_fkey";

-- AddForeignKey
ALTER TABLE "UserTopicPreference" ADD CONSTRAINT "UserTopicPreference_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTopicMastery" ADD CONSTRAINT "UserTopicMastery_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTopic" ADD CONSTRAINT "ProblemTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProblemState" ADD CONSTRAINT "UserProblemState_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationItem" ADD CONSTRAINT "RecommendationItem_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlanItem" ADD CONSTRAINT "StudyPlanItem_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
