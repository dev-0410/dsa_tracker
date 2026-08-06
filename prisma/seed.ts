import { Difficulty, Platform, PrismaClient } from "@prisma/client";
import { prerequisiteSeeds, problemSeeds, topicSeeds } from "./catalog";

const prisma = new PrismaClient();

function topicWeight(index: number, count: number) {
  if (count === 1) return 1;
  if (index === 0) return 0.65;
  return 0.35 / (count - 1);
}

async function main() {
  const result = await prisma.$transaction(
    async (transaction) => {
      for (const topic of topicSeeds) {
        await transaction.topic.upsert({
          where: { slug: topic.slug },
          update: topic,
          create: topic,
        });
      }

      const topics = await transaction.topic.findMany({ select: { id: true, slug: true } });
      const topicIds = new Map(topics.map((topic) => [topic.slug, topic.id]));

      await transaction.topicPrerequisite.deleteMany();
      await transaction.topicPrerequisite.createMany({
        data: prerequisiteSeeds.map(([topic, prerequisite]) => ({
          topicId: topicIds.get(topic)!,
          prerequisiteId: topicIds.get(prerequisite)!,
        })),
        skipDuplicates: true,
      });

      for (const entry of problemSeeds) {
        const data = {
          platform: Platform.LEETCODE,
          externalId: entry.externalId,
          slug: entry.slug,
          title: entry.title,
          url: `https://leetcode.com/problems/${entry.slug}/`,
          difficulty: Difficulty[entry.difficulty],
          difficultyB: entry.difficultyB,
          estimatedMinutes: entry.estimatedMinutes,
          qualityScore: entry.qualityScore,
          pattern: entry.pattern,
          isPremium: false,
          isActive: true,
          catalogVersion: "2026.1",
          metadata: {
            provenance: "manually curated metadata",
            contentStored: false,
          },
          reviewedAt: new Date("2026-08-01T00:00:00.000Z"),
        };

        const catalogProblem = await transaction.problem.upsert({
          where: {
            platform_externalId: {
              platform: Platform.LEETCODE,
              externalId: entry.externalId,
            },
          },
          update: data,
          create: data,
        });

        await transaction.problemTopic.deleteMany({ where: { problemId: catalogProblem.id } });
        await transaction.problemTopic.createMany({
          data: entry.topics.map((slug, index) => ({
            problemId: catalogProblem.id,
            topicId: topicIds.get(slug)!,
            weight: topicWeight(index, entry.topics.length),
            isPrimary: index === 0,
          })),
        });
      }

      await transaction.problem.updateMany({
        where: {
          platform: Platform.LEETCODE,
          externalId: { notIn: problemSeeds.map((entry) => entry.externalId) },
        },
        data: { isActive: false },
      });

      const [topicCount, problemCount] = await Promise.all([
        transaction.topic.count(),
        transaction.problem.count({ where: { isActive: true } }),
      ]);
      return { topicCount, problemCount };
    },
    { timeout: 30_000 },
  );

  console.info(`Seeded ${result.topicCount} topics and ${result.problemCount} active catalog problems.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
