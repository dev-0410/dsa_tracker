/**
 * Imports the public LeetCode problemset into the local catalog.
 *
 * Replaces the hand-authored seed list: difficulty comes from each problem's
 * observed acceptance rate rather than an authored guess, and topics come from
 * LeetCode's own tags mapped onto catalog slugs.
 *
 *   npx tsx scripts/import-leetcode-catalog.ts [--limit N] [--dry-run]
 */
import "dotenv/config";
import { Difficulty, Platform, PrismaClient } from "@prisma/client";
import { fetchLeetCodeCatalogPage } from "../src/lib/platforms/leetcode-catalog";
import { prerequisiteSeeds, topicSeeds } from "../prisma/catalog";

const db = new PrismaClient();
const PAGE_SIZE = 100;

function parseArgs() {
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf("--limit");
  return {
    limit: limitIndex >= 0 ? Number(args[limitIndex + 1]) : Infinity,
    dryRun: args.includes("--dry-run"),
  };
}

function topicWeight(index: number, total: number): number {
  if (total <= 1) return 1;
  // Primary topic carries more weight; the rest split the remainder evenly.
  return index === 0 ? 0.5 : 0.5 / (total - 1);
}

async function ensureTopics() {
  for (const topic of topicSeeds) {
    await db.topic.upsert({
      where: { slug: topic.slug },
      create: topic,
      update: { name: topic.name, description: topic.description, sortOrder: topic.sortOrder },
    });
  }

  const ids = new Map((await db.topic.findMany({ select: { id: true, slug: true } })).map((t) => [t.slug, t.id]));

  await db.topicPrerequisite.deleteMany({});
  await db.topicPrerequisite.createMany({
    data: prerequisiteSeeds
      .filter(([topic, prereq]) => ids.has(topic) && ids.has(prereq))
      .map(([topic, prereq]) => ({ topicId: ids.get(topic)!, prerequisiteId: ids.get(prereq)! })),
    skipDuplicates: true,
  });

  return ids;
}

async function main() {
  const { limit, dryRun } = parseArgs();
  const topicIds = await ensureTopics();
  console.log(`topics ready: ${topicIds.size}`);

  const first = await fetchLeetCodeCatalogPage({ limit: 1, skip: 0 });
  const total = Math.min(first.totalLength, limit);
  console.log(`LeetCode reports ${first.totalLength} problems; importing up to ${total}`);

  let imported = 0;
  let skippedNoTopic = 0;
  const seenExternalIds: string[] = [];

  for (let skip = 0; skip < total; skip += PAGE_SIZE) {
    const page = await fetchLeetCodeCatalogPage({
      limit: Math.min(PAGE_SIZE, total - skip),
      skip,
    });
    skippedNoTopic += page.rawCount - page.problems.length;

    for (const problem of page.problems) {
      seenExternalIds.push(problem.externalId);
      if (dryRun) continue;

      const data = {
        platform: Platform.LEETCODE,
        externalId: problem.externalId,
        slug: problem.slug,
        title: problem.title,
        url: `https://leetcode.com/problems/${problem.slug}/`,
        difficulty: Difficulty[problem.difficulty],
        difficultyB: problem.difficultyB,
        estimatedMinutes: problem.estimatedMinutes,
        qualityScore: problem.qualityScore,
        isPremium: problem.isPremium,
        isActive: true,
        catalogVersion: "leetcode-import",
        metadata: { provenance: "leetcode public problemset", contentStored: false },
      };

      const row = await db.problem.upsert({
        where: { platform_externalId: { platform: Platform.LEETCODE, externalId: problem.externalId } },
        create: data,
        update: data,
      });

      const links = problem.topicSlugs
        .filter((slug) => topicIds.has(slug))
        .map((slug, index) => ({
          problemId: row.id,
          topicId: topicIds.get(slug)!,
          weight: topicWeight(index, problem.topicSlugs.length),
          isPrimary: index === 0,
        }));

      await db.problemTopic.deleteMany({ where: { problemId: row.id } });
      if (links.length > 0) await db.problemTopic.createMany({ data: links, skipDuplicates: true });
      imported += 1;
    }

    console.log(`  ${Math.min(skip + PAGE_SIZE, total)}/${total} processed (${imported} imported)`);
    // Be gentle with an undocumented endpoint.
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  if (!dryRun) {
    // Anything no longer present upstream is retired rather than deleted, so
    // existing attempts and review history keep their foreign keys.
    const retired = await db.problem.updateMany({
      where: { platform: Platform.LEETCODE, externalId: { notIn: seenExternalIds } },
      data: { isActive: false },
    });
    console.log(`retired ${retired.count} problems no longer in the upstream set`);
  }

  const [topicCount, activeCount] = await Promise.all([
    db.topic.count(),
    db.problem.count({ where: { isActive: true } }),
  ]);
  console.log(
    `\ndone: ${imported} imported, ${skippedNoTopic} skipped (no mappable topic)\n` +
      `catalog now: ${topicCount} topics, ${activeCount} active problems`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
