import "server-only";

import { Platform } from "@prisma/client";
import { db } from "@/lib/db";
import { aggregateTopicEvidence, thetaFromSolvedCount } from "@/lib/platforms/topic-mapping";
import type { PlatformStats } from "@/lib/platforms";

const EXPERIENCE_PRIOR: Record<string, number> = {
  BEGINNER: -1.25,
  INTERMEDIATE: -0.25,
  ADVANCED: 0.65,
};

function masteryFromTheta(theta: number): number {
  const clamped = Math.min(3, Math.max(-3, theta));
  return 1 / (1 + Math.exp(-clamped));
}

/**
 * Seeds per-topic mastery from a platform's solved-per-topic counts.
 *
 * Only topics the user has never practised in-app are written. In-app attempts
 * carry outcome, duration, and hint data that a bare external count cannot, so
 * they always win — this exists to remove the cold start, not to override
 * evidence the app collected itself.
 *
 * Returns the number of topics seeded.
 */
export async function seedMasteryFromPlatform(options: {
  userId: string;
  platform: Platform;
  stats: PlatformStats;
}): Promise<number> {
  const solvedByTag = options.stats.solvedByTag ?? [];
  if (solvedByTag.length === 0) return 0;

  const evidence = aggregateTopicEvidence(
    options.platform === Platform.LEETCODE ? "LEETCODE" : "CODEFORCES",
    solvedByTag,
  );
  if (evidence.length === 0) return 0;

  const [profile, topics] = await Promise.all([
    db.userProfile.findUnique({
      where: { userId: options.userId },
      select: { experienceLevel: true },
    }),
    db.topic.findMany({
      select: { id: true, slug: true },
    }),
  ]);

  const priorTheta = EXPERIENCE_PRIOR[profile?.experienceLevel ?? "INTERMEDIATE"] ?? -0.25;
  const evidenceBySlug = new Map(evidence.map((item) => [item.topicSlug, item]));

  // Topics with in-app history are left untouched.
  const existing = await db.userTopicMastery.findMany({
    where: { userId: options.userId },
    select: { topicId: true, attemptCount: true, theta: true },
  });
  const existingByTopicId = new Map(existing.map((row) => [row.topicId, row]));
  let evidenceWrites = 0;

  const writes = topics.flatMap((topic) => {
    const current = existingByTopicId.get(topic.id);
    if (current && current.attemptCount > 0) return [];
    const item = evidenceBySlug.get(topic.slug);

    if (!item) {
      if (current) return [];
      return [
        db.userTopicMastery.create({
          data: {
            userId: options.userId,
            topicId: topic.id,
            theta: priorTheta,
            mastery: masteryFromTheta(priorTheta),
            uncertainty: 1,
            attemptCount: 0,
            effectiveSuccess: 0,
          },
        }),
      ];
    }

    const theta = thetaFromSolvedCount(item.solved, priorTheta);
    // Keep the strongest external signal when multiple platforms map to the
    // same topic, and do not relabel a stated prior as imported evidence when
    // the solved count does not improve it.
    if (theta <= priorTheta || (current && current.theta >= theta)) return [];
    evidenceWrites += 1;

    return [
      db.userTopicMastery.upsert({
        where: { userId_topicId: { userId: options.userId, topicId: topic.id } },
        create: {
          userId: options.userId,
          topicId: topic.id,
          theta,
          mastery: masteryFromTheta(theta),
          // External counts are weaker evidence than a logged attempt, so
          // uncertainty stays high and attemptCount stays 0 — the exploration
          // term should still consider these topics worth probing.
          uncertainty: 0.75,
          attemptCount: 0,
          effectiveSuccess: 0,
        },
        update: {
          theta,
          mastery: masteryFromTheta(theta),
          uncertainty: 0.75,
        },
      }),
    ];
  });

  if (writes.length === 0) return evidenceWrites;
  await db.$transaction(writes);
  return evidenceWrites;
}
