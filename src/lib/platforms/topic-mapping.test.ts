import { describe, expect, it } from "vitest";
import { aggregateTopicEvidence, thetaFromSolvedCount } from "./topic-mapping";

describe("external topic evidence", () => {
  it("does not double-count overlapping platform tags mapped to one topic", () => {
    const evidence = aggregateTopicEvidence("LEETCODE", [
      { tagSlug: "tree", solved: 80 },
      { tagSlug: "binary-tree", solved: 65 },
      { tagSlug: "binary-search-tree", solved: 12 },
    ]);

    expect(evidence).toContainEqual({ topicSlug: "trees", solved: 80 });
    expect(evidence).toContainEqual({ topicSlug: "bst", solved: 12 });
  });

  it("keeps external estimates finite, monotonic, and capped", () => {
    const prior = -1.25;
    const estimates = [0, 1, 10, 50, 200, 10_000].map((solved) =>
      thetaFromSolvedCount(solved, prior),
    );

    expect(estimates.every(Number.isFinite)).toBe(true);
    expect(estimates).toEqual([...estimates].sort((left, right) => left - right));
    expect(estimates[0]).toBe(prior);
    expect(estimates.at(-1)).toBe(0.9);
  });
});
