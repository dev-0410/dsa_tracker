import { describe, expect, it } from "vitest";
import { fetchLeetCodeStats } from "@/lib/platforms/leetcode";
import { aggregateTopicEvidence, thetaFromSolvedCount } from "@/lib/platforms/topic-mapping";

const HANDLE = process.env.LEETCODE_TEST_HANDLE ?? "Esha_10_Tandon";

describe("leetcode per-topic mapping (live network)", () => {
  it("turns a real profile into per-topic ability estimates", async () => {
    const stats = await fetchLeetCodeStats(HANDLE);

    expect(stats.totalSolved).toBeGreaterThan(0);
    expect(stats.solvedByTag?.length ?? 0).toBeGreaterThan(0);

    const evidence = aggregateTopicEvidence("LEETCODE", stats.solvedByTag ?? []);
    expect(evidence.length).toBeGreaterThan(0);

    const prior = -0.25;
    const rows = evidence
      .map((item) => ({ ...item, theta: thetaFromSolvedCount(item.solved, prior) }))
      .sort((left, right) => right.solved - left.solved);

    // Every mapped topic must land on a real ability number at or above prior.
    for (const row of rows) {
      expect(Number.isFinite(row.theta)).toBe(true);
      expect(row.theta).toBeGreaterThanOrEqual(prior);
      expect(row.theta).toBeLessThanOrEqual(0.9);
    }

    // A heavily practised topic must outrank a barely practised one.
    const strongest = rows[0];
    const weakest = rows[rows.length - 1];
    if (strongest.solved > weakest.solved) {
      expect(strongest.theta).toBeGreaterThanOrEqual(weakest.theta);
    }

    console.log(`\n${HANDLE}: ${stats.totalSolved} solved -> ${rows.length} catalog topics`);
    for (const row of rows) {
      const mastery = 1 / (1 + Math.exp(-row.theta));
      console.log(
        `  ${row.topicSlug.padEnd(22)}${String(row.solved).padStart(5)} solved   ` +
          `theta ${row.theta.toFixed(2).padStart(5)}   mastery ${(mastery * 100).toFixed(0).padStart(3)}%`,
      );
    }
  });
});
