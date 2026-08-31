/**
 * Maps platform-native topic tags onto the catalog's topic slugs and converts
 * external solved counts into a starting ability estimate.
 *
 * Aggregate totals cannot seed mastery: 400 solved problems says nothing about
 * whether the user is strong at graphs or has never opened a trie. Per-topic
 * counts can, so a user who arrives with real practice history starts with a
 * calibrated profile instead of being treated as a beginner everywhere.
 */

/** LeetCode tag slug -> catalog topic slug. Unmapped tags are ignored. */
const LEETCODE_TAG_TO_TOPIC: Readonly<Record<string, string>> = Object.freeze({
  array: "arrays",
  string: "strings",
  "hash-table": "hashing",
  "two-pointers": "two-pointers",
  "sliding-window": "sliding-window",
  "prefix-sum": "prefix-sum",
  "binary-search": "binary-search",
  "linked-list": "linked-list",
  stack: "stack",
  "monotonic-stack": "monotonic-stack",
  queue: "queue",
  "monotonic-queue": "queue",
  heap: "heap",
  "heap-priority-queue": "heap",
  tree: "trees",
  "binary-tree": "trees",
  "binary-search-tree": "bst",
  trie: "trie",
  graph: "graphs",
  "shortest-path": "shortest-path",
  "depth-first-search": "dfs",
  "breadth-first-search": "bfs",
  "topological-sort": "topological-sort",
  "union-find": "union-find",
  recursion: "recursion",
  backtracking: "backtracking",
  "dynamic-programming": "dynamic-programming",
  memoization: "dynamic-programming",
  greedy: "greedy",
  "sweep-line": "intervals",
  sorting: "sorting",
  "divide-and-conquer": "sorting",
  "merge-sort": "sorting",
  "bucket-sort": "sorting",
  "counting-sort": "sorting",
  "radix-sort": "sorting",
  quickselect: "sorting",
  "doubly-linked-list": "linked-list",
  "ordered-map": "bst",
  "minimum-spanning-tree": "graphs",
  "strongly-connected-component": "graphs",
  "biconnected-component": "graphs",
  "eulerian-circuit": "graphs",
  "game-theory": "dynamic-programming",
  "minimax-algorithm": "dynamic-programming",
  "probability-and-statistics": "math",
  "hash-function": "hashing",
  brainteaser: "math",
  "meet-in-the-middle": "backtracking",
  matrix: "matrix",
  "bit-manipulation": "bit-manipulation",
  bitmask: "bit-manipulation",
  math: "math",
  "number-theory": "math",
  combinatorics: "math",
  geometry: "math",
  simulation: "arrays",
  counting: "hashing",
  "ordered-set": "bst",
  "segment-tree": "segment-tree",
  "binary-indexed-tree": "segment-tree",
  "string-matching": "string-matching",
  "rolling-hash": "string-matching",
  "suffix-array": "string-matching",
  "data-stream": "heap",
  design: "arrays",
  enumeration: "arrays",
  iterator: "arrays",
});

/**
 * Codeforces exposes problem tags on submissions rather than a solved-per-topic
 * summary, so only the subset that lines up with the catalog is mapped.
 */
const CODEFORCES_TAG_TO_TOPIC: Readonly<Record<string, string>> = Object.freeze({
  "binary search": "binary-search",
  bitmasks: "bit-manipulation",
  "brute force": "arrays",
  "data structures": "arrays",
  dfs: "dfs",
  "dfs and similar": "dfs",
  dp: "dynamic-programming",
  dsu: "union-find",
  geometry: "math",
  graphs: "graphs",
  greedy: "greedy",
  hashing: "hashing",
  implementation: "arrays",
  math: "math",
  "number theory": "math",
  "shortest paths": "graphs",
  sortings: "sorting",
  strings: "strings",
  trees: "trees",
  "two pointers": "two-pointers",
});

export function mapPlatformTag(platform: "LEETCODE" | "CODEFORCES", tagSlug: string): string | null {
  const key = tagSlug.trim().toLowerCase();
  const table = platform === "LEETCODE" ? LEETCODE_TAG_TO_TOPIC : CODEFORCES_TAG_TO_TOPIC;
  return table[key] ?? null;
}

/**
 * Converts a solved count into an IRT ability estimate.
 *
 * The curve is deliberately conservative: external counts carry no information
 * about difficulty, hints, or how long ago the work happened, so it saturates
 * well below the maximum. It only has to beat the experience-level prior, and
 * in-app attempts move theta from there.
 *
 * 0 -> prior, 10 -> ~-0.4, 50 -> ~+0.3, 200+ -> ~+0.9 (capped).
 */
export function thetaFromSolvedCount(solved: number, priorTheta: number): number {
  if (solved <= 0) return priorTheta;
  const ceiling = 0.9;
  const scaled = Math.log1p(Math.max(0, solved)) / Math.log1p(200);
  const estimate = -0.9 + (ceiling - -0.9) * Math.min(1, scaled);
  // Never lower a user below their stated prior on the strength of solve counts.
  return Math.max(priorTheta, Math.min(ceiling, estimate));
}

export interface ExternalTopicEvidence {
  topicSlug: string;
  solved: number;
}

/**
 * Collapses platform tags onto catalog topics. Platform tag buckets overlap —
 * the same problem can be both `tree` and `binary-tree` — so taking the maximum
 * is a conservative approximation of the union. Summing would definitely
 * double-count some solved problems and overstate the user's starting ability.
 */
export function aggregateTopicEvidence(
  platform: "LEETCODE" | "CODEFORCES",
  solvedByTag: Array<{ tagSlug: string; solved: number }>,
): ExternalTopicEvidence[] {
  const byTopic = new Map<string, number>();
  for (const tag of solvedByTag) {
    const topicSlug = mapPlatformTag(platform, tag.tagSlug);
    if (!topicSlug) continue;
    byTopic.set(topicSlug, Math.max(byTopic.get(topicSlug) ?? 0, Math.max(0, tag.solved)));
  }
  return [...byTopic.entries()].map(([topicSlug, solved]) => ({ topicSlug, solved }));
}
