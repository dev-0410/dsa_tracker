import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DAY_MS = 24 * 60 * 60 * 1_000;

function retentionDays(name: string, fallback: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1 || value > 3_650) {
    throw new Error(`${name} must be an integer between 1 and 3650.`);
  }
  return value;
}

async function main() {
  const now = new Date();
  const recommendationCutoff = new Date(
    now.getTime() - retentionDays("RECOMMENDATION_RETENTION_DAYS", 90) * DAY_MS,
  );
  const platformCutoff = new Date(
    now.getTime() - retentionDays("PLATFORM_SNAPSHOT_RETENTION_DAYS", 365) * DAY_MS,
  );

  const [sessions, verificationTokens, recommendationRuns, platformSnapshots] = await prisma.$transaction([
    prisma.session.deleteMany({ where: { expires: { lt: now } } }),
    prisma.verificationToken.deleteMany({ where: { expires: { lt: now } } }),
    prisma.recommendationRun.deleteMany({
      where: {
        expiresAt: { lt: now },
        createdAt: { lt: recommendationCutoff },
      },
    }),
    prisma.$executeRaw(Prisma.sql`
      DELETE FROM "PlatformSnapshot"
      WHERE "id" IN (
        SELECT "id"
        FROM (
          SELECT
            "id",
            "capturedAt",
            ROW_NUMBER() OVER (
              PARTITION BY "identityId"
              ORDER BY "capturedAt" DESC, "id" DESC
            ) AS "snapshotRank"
          FROM "PlatformSnapshot"
        ) AS "rankedSnapshots"
        WHERE "snapshotRank" > 1
          AND "capturedAt" < ${platformCutoff}
      )
    `),
  ]);

  console.info(
    JSON.stringify({
      cleanedAt: now.toISOString(),
      expiredSessions: sessions.count,
      expiredVerificationTokens: verificationTokens.count,
      oldRecommendationRuns: recommendationRuns.count,
      oldPlatformSnapshots: platformSnapshots,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
