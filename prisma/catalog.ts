export type CatalogDifficulty = "EASY" | "MEDIUM" | "HARD";

export type TopicSeed = {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
};

export type CatalogProblemSeed = {
  externalId: string;
  slug: string;
  title: string;
  difficulty: CatalogDifficulty;
  difficultyB: number;
  estimatedMinutes: number;
  qualityScore: number;
  pattern: string;
  topics: readonly [string, ...string[]];
};

export const topicSeeds: TopicSeed[] = [
  { slug: "arrays", name: "Arrays", description: "Indexing, traversal, and in-place transformations.", sortOrder: 10 },
  { slug: "strings", name: "Strings", description: "Parsing, matching, and string transformations.", sortOrder: 20 },
  { slug: "hashing", name: "Hashing", description: "Fast lookup, counting, and deduplication patterns.", sortOrder: 30 },
  { slug: "two-pointers", name: "Two pointers", description: "Coordinated scans over ordered or constrained data.", sortOrder: 40 },
  { slug: "sliding-window", name: "Sliding window", description: "Maintain a moving range with incremental state.", sortOrder: 50 },
  { slug: "prefix-sum", name: "Prefix sums", description: "Precompute cumulative state for fast range reasoning.", sortOrder: 60 },
  { slug: "binary-search", name: "Binary search", description: "Search monotonic spaces and ordered collections.", sortOrder: 70 },
  { slug: "linked-list", name: "Linked lists", description: "Pointer rewiring, cycles, and list invariants.", sortOrder: 80 },
  { slug: "stack", name: "Stacks", description: "LIFO state, parsing, and deferred resolution.", sortOrder: 90 },
  { slug: "monotonic-stack", name: "Monotonic stacks", description: "Nearest greater or smaller element patterns.", sortOrder: 100 },
  { slug: "queue", name: "Queues", description: "FIFO processing and level-by-level exploration.", sortOrder: 110 },
  { slug: "heap", name: "Heaps", description: "Priority queues, top-k, and streaming order statistics.", sortOrder: 120 },
  { slug: "trees", name: "Trees", description: "Recursive structures, traversal, and subtree reasoning.", sortOrder: 130 },
  { slug: "bst", name: "Binary search trees", description: "Ordered-tree invariants and rank queries.", sortOrder: 140 },
  { slug: "trie", name: "Tries", description: "Prefix indexing and dictionary search.", sortOrder: 150 },
  { slug: "graphs", name: "Graphs", description: "Connectivity, paths, and state-space modeling.", sortOrder: 160 },
  { slug: "dfs", name: "Depth-first search", description: "Recursive exploration and component discovery.", sortOrder: 170 },
  { slug: "bfs", name: "Breadth-first search", description: "Shortest unweighted paths and layered traversal.", sortOrder: 180 },
  { slug: "topological-sort", name: "Topological sort", description: "Dependency ordering in directed acyclic graphs.", sortOrder: 190 },
  { slug: "union-find", name: "Union find", description: "Dynamic connectivity with disjoint sets.", sortOrder: 200 },
  { slug: "recursion", name: "Recursion", description: "Base cases, call state, and recursive decomposition.", sortOrder: 210 },
  { slug: "backtracking", name: "Backtracking", description: "Search decision trees with reversible choices.", sortOrder: 220 },
  { slug: "dynamic-programming", name: "Dynamic programming", description: "Overlapping subproblems and optimal substructure.", sortOrder: 230 },
  { slug: "greedy", name: "Greedy", description: "Locally optimal choices backed by invariants.", sortOrder: 240 },
  { slug: "intervals", name: "Intervals", description: "Merging, scheduling, and overlap reasoning.", sortOrder: 250 },
  { slug: "sorting", name: "Sorting", description: "Ordering data to reveal useful structure.", sortOrder: 260 },
  { slug: "matrix", name: "Matrices", description: "Grid traversal and in-place matrix transforms.", sortOrder: 270 },
  { slug: "bit-manipulation", name: "Bit manipulation", description: "Masks, XOR properties, and binary arithmetic.", sortOrder: 280 },
  { slug: "math", name: "Math", description: "Number properties, combinatorics, and algebraic reasoning.", sortOrder: 290 },
];

export const prerequisiteSeeds: Array<[topic: string, prerequisite: string]> = [
  ["hashing", "arrays"],
  ["two-pointers", "arrays"],
  ["sliding-window", "arrays"],
  ["prefix-sum", "arrays"],
  ["binary-search", "arrays"],
  ["monotonic-stack", "stack"],
  ["bst", "trees"],
  ["trie", "strings"],
  ["dfs", "graphs"],
  ["bfs", "graphs"],
  ["topological-sort", "graphs"],
  ["union-find", "graphs"],
  ["backtracking", "recursion"],
  ["dynamic-programming", "recursion"],
  ["intervals", "sorting"],
  ["matrix", "arrays"],
];

const problem = (
  externalId: string,
  slug: string,
  title: string,
  difficulty: CatalogDifficulty,
  difficultyB: number,
  estimatedMinutes: number,
  qualityScore: number,
  pattern: string,
  topics: CatalogProblemSeed["topics"],
): CatalogProblemSeed => ({
  externalId,
  slug,
  title,
  difficulty,
  difficultyB,
  estimatedMinutes,
  qualityScore,
  pattern,
  topics,
});

export const problemSeeds: CatalogProblemSeed[] = [
  problem("1", "two-sum", "Two Sum", "EASY", -1.55, 18, 0.98, "complement lookup", ["hashing", "arrays"]),
  problem("121", "best-time-to-buy-and-sell-stock", "Best Time to Buy and Sell Stock", "EASY", -1.35, 20, 0.96, "running minimum", ["arrays", "greedy"]),
  problem("217", "contains-duplicate", "Contains Duplicate", "EASY", -1.65, 12, 0.9, "set membership", ["hashing", "arrays"]),
  problem("238", "product-of-array-except-self", "Product of Array Except Self", "MEDIUM", -0.05, 32, 0.97, "bidirectional prefix product", ["prefix-sum", "arrays"]),
  problem("53", "maximum-subarray", "Maximum Subarray", "MEDIUM", -0.25, 28, 0.96, "Kadane state", ["dynamic-programming", "arrays"]),
  problem("152", "maximum-product-subarray", "Maximum Product Subarray", "MEDIUM", 0.25, 38, 0.91, "dual extremum state", ["dynamic-programming", "arrays"]),
  problem("128", "longest-consecutive-sequence", "Longest Consecutive Sequence", "MEDIUM", 0.1, 32, 0.95, "sequence boundary lookup", ["hashing", "arrays"]),
  problem("146", "lru-cache", "LRU Cache", "MEDIUM", 0.55, 45, 0.97, "hash map plus linked list", ["linked-list", "hashing"]),
  problem("981", "time-based-key-value-store", "Time Based Key-Value Store", "MEDIUM", 0.15, 35, 0.9, "per-key ordered search", ["binary-search", "hashing"]),

  problem("125", "valid-palindrome", "Valid Palindrome", "EASY", -1.5, 15, 0.91, "converging pointers", ["two-pointers", "strings"]),
  problem("15", "3sum", "3Sum", "MEDIUM", 0.2, 40, 0.98, "sort and converge", ["two-pointers", "sorting"]),
  problem("11", "container-with-most-water", "Container With Most Water", "MEDIUM", -0.05, 28, 0.96, "greedy pointer movement", ["two-pointers", "arrays"]),
  problem("42", "trapping-rain-water", "Trapping Rain Water", "HARD", 1.25, 55, 0.97, "bounded water invariant", ["two-pointers", "prefix-sum"]),
  problem("3", "longest-substring-without-repeating-characters", "Longest Substring Without Repeating Characters", "MEDIUM", 0.05, 32, 0.98, "unique-character window", ["sliding-window", "strings"]),
  problem("424", "longest-repeating-character-replacement", "Longest Repeating Character Replacement", "MEDIUM", 0.35, 38, 0.94, "replaceable window", ["sliding-window", "strings"]),
  problem("76", "minimum-window-substring", "Minimum Window Substring", "HARD", 1.45, 60, 0.98, "formed-requirements window", ["sliding-window", "strings"]),
  problem("242", "valid-anagram", "Valid Anagram", "EASY", -1.55, 15, 0.92, "frequency equality", ["hashing", "strings"]),
  problem("49", "group-anagrams", "Group Anagrams", "MEDIUM", -0.05, 30, 0.96, "canonical frequency key", ["hashing", "strings"]),

  problem("20", "valid-parentheses", "Valid Parentheses", "EASY", -1.4, 18, 0.96, "matching opener stack", ["stack", "strings"]),
  problem("155", "min-stack", "Min Stack", "MEDIUM", -0.15, 28, 0.92, "auxiliary minimum state", ["stack"]),
  problem("739", "daily-temperatures", "Daily Temperatures", "MEDIUM", 0.15, 35, 0.96, "next greater element", ["monotonic-stack", "stack"]),
  problem("84", "largest-rectangle-in-histogram", "Largest Rectangle in Histogram", "HARD", 1.55, 60, 0.98, "monotonic boundary expansion", ["monotonic-stack", "stack"]),

  problem("206", "reverse-linked-list", "Reverse Linked List", "EASY", -1.35, 18, 0.98, "pointer reversal", ["linked-list"]),
  problem("141", "linked-list-cycle", "Linked List Cycle", "EASY", -1.05, 22, 0.95, "fast and slow pointers", ["linked-list", "two-pointers"]),
  problem("21", "merge-two-sorted-lists", "Merge Two Sorted Lists", "EASY", -1.15, 22, 0.97, "sentinel merge", ["linked-list", "two-pointers"]),
  problem("19", "remove-nth-node-from-end-of-list", "Remove Nth Node From End of List", "MEDIUM", 0.05, 30, 0.93, "fixed-gap pointers", ["linked-list", "two-pointers"]),
  problem("143", "reorder-list", "Reorder List", "MEDIUM", 0.35, 40, 0.96, "split reverse merge", ["linked-list", "two-pointers"]),
  problem("23", "merge-k-sorted-lists", "Merge k Sorted Lists", "HARD", 1.1, 50, 0.96, "k-way heap merge", ["heap", "linked-list"]),

  problem("704", "binary-search", "Binary Search", "EASY", -1.45, 16, 0.96, "closed interval search", ["binary-search", "arrays"]),
  problem("74", "search-a-2d-matrix", "Search a 2D Matrix", "MEDIUM", -0.05, 28, 0.92, "flattened index search", ["binary-search", "matrix"]),
  problem("153", "find-minimum-in-rotated-sorted-array", "Find Minimum in Rotated Sorted Array", "MEDIUM", 0.15, 32, 0.96, "rotated boundary search", ["binary-search", "arrays"]),
  problem("33", "search-in-rotated-sorted-array", "Search in Rotated Sorted Array", "MEDIUM", 0.35, 38, 0.97, "sorted-half elimination", ["binary-search", "arrays"]),
  problem("875", "koko-eating-bananas", "Koko Eating Bananas", "MEDIUM", 0.25, 35, 0.95, "binary search on answer", ["binary-search", "arrays"]),

  problem("347", "top-k-frequent-elements", "Top K Frequent Elements", "MEDIUM", -0.05, 30, 0.97, "frequency heap", ["heap", "hashing"]),
  problem("295", "find-median-from-data-stream", "Find Median from Data Stream", "HARD", 1.2, 55, 0.96, "two balanced heaps", ["heap"]),
  problem("621", "task-scheduler", "Task Scheduler", "MEDIUM", 0.45, 40, 0.9, "cooldown frequency scheduling", ["greedy", "heap"]),

  problem("226", "invert-binary-tree", "Invert Binary Tree", "EASY", -1.4, 16, 0.96, "recursive subtree swap", ["trees", "dfs"]),
  problem("104", "maximum-depth-of-binary-tree", "Maximum Depth of Binary Tree", "EASY", -1.35, 18, 0.96, "recursive depth", ["trees", "dfs"]),
  problem("100", "same-tree", "Same Tree", "EASY", -1.2, 18, 0.92, "parallel traversal", ["trees", "dfs"]),
  problem("102", "binary-tree-level-order-traversal", "Binary Tree Level Order Traversal", "MEDIUM", -0.15, 28, 0.96, "level queue", ["trees", "bfs"]),
  problem("98", "validate-binary-search-tree", "Validate Binary Search Tree", "MEDIUM", 0.15, 35, 0.98, "range invariant", ["bst", "trees"]),
  problem("230", "kth-smallest-element-in-a-bst", "Kth Smallest Element in a BST", "MEDIUM", 0.05, 30, 0.94, "inorder rank", ["bst", "trees"]),
  problem("235", "lowest-common-ancestor-of-a-binary-search-tree", "Lowest Common Ancestor of a Binary Search Tree", "MEDIUM", -0.15, 25, 0.92, "ordered split point", ["bst", "trees"]),
  problem("236", "lowest-common-ancestor-of-a-binary-tree", "Lowest Common Ancestor of a Binary Tree", "MEDIUM", 0.4, 40, 0.97, "postorder signal propagation", ["trees", "dfs"]),
  problem("124", "binary-tree-maximum-path-sum", "Binary Tree Maximum Path Sum", "HARD", 1.5, 60, 0.98, "gain versus global path", ["trees", "dfs"]),
  problem("297", "serialize-and-deserialize-binary-tree", "Serialize and Deserialize Binary Tree", "HARD", 1.25, 55, 0.97, "structure-preserving traversal", ["trees", "bfs"]),

  problem("208", "implement-trie-prefix-tree", "Implement Trie (Prefix Tree)", "MEDIUM", -0.05, 35, 0.96, "prefix node index", ["trie", "strings"]),
  problem("211", "design-add-and-search-words-data-structure", "Design Add and Search Words Data Structure", "MEDIUM", 0.35, 42, 0.93, "wildcard trie DFS", ["trie", "backtracking"]),
  problem("212", "word-search-ii", "Word Search II", "HARD", 1.55, 65, 0.98, "trie-pruned grid search", ["trie", "backtracking", "matrix"]),

  problem("200", "number-of-islands", "Number of Islands", "MEDIUM", -0.05, 32, 0.99, "component flood fill", ["graphs", "dfs", "matrix"]),
  problem("133", "clone-graph", "Clone Graph", "MEDIUM", 0.05, 32, 0.95, "memoized traversal", ["graphs", "dfs"]),
  problem("417", "pacific-atlantic-water-flow", "Pacific Atlantic Water Flow", "MEDIUM", 0.5, 45, 0.94, "reverse reachability", ["graphs", "dfs", "matrix"]),
  problem("994", "rotting-oranges", "Rotting Oranges", "MEDIUM", -0.05, 30, 0.96, "multi-source BFS", ["bfs", "graphs", "matrix"]),
  problem("207", "course-schedule", "Course Schedule", "MEDIUM", 0.15, 35, 0.98, "cycle detection", ["topological-sort", "graphs"]),
  problem("210", "course-schedule-ii", "Course Schedule II", "MEDIUM", 0.3, 40, 0.95, "dependency ordering", ["topological-sort", "graphs"]),
  problem("684", "redundant-connection", "Redundant Connection", "MEDIUM", 0.25, 35, 0.93, "cycle-forming union", ["union-find", "graphs"]),
  problem("127", "word-ladder", "Word Ladder", "HARD", 1.35, 55, 0.97, "implicit graph BFS", ["bfs", "graphs", "strings"]),

  problem("39", "combination-sum", "Combination Sum", "MEDIUM", 0.05, 35, 0.96, "reusable-choice search", ["backtracking", "recursion"]),
  problem("46", "permutations", "Permutations", "MEDIUM", -0.05, 30, 0.95, "choose and unchoose", ["backtracking", "recursion"]),
  problem("78", "subsets", "Subsets", "MEDIUM", -0.2, 28, 0.97, "binary decision tree", ["backtracking", "recursion"]),
  problem("79", "word-search", "Word Search", "MEDIUM", 0.25, 38, 0.96, "grid path backtracking", ["backtracking", "matrix"]),
  problem("51", "n-queens", "N-Queens", "HARD", 1.4, 60, 0.96, "constraint-set search", ["backtracking", "recursion"]),

  problem("70", "climbing-stairs", "Climbing Stairs", "EASY", -1.35, 18, 0.94, "one-dimensional recurrence", ["dynamic-programming", "recursion"]),
  problem("198", "house-robber", "House Robber", "MEDIUM", -0.15, 28, 0.98, "take-or-skip recurrence", ["dynamic-programming", "arrays"]),
  problem("213", "house-robber-ii", "House Robber II", "MEDIUM", 0.2, 35, 0.93, "circular case split", ["dynamic-programming", "arrays"]),
  problem("322", "coin-change", "Coin Change", "MEDIUM", 0.3, 40, 0.98, "unbounded minimum recurrence", ["dynamic-programming", "arrays"]),
  problem("300", "longest-increasing-subsequence", "Longest Increasing Subsequence", "MEDIUM", 0.45, 45, 0.97, "subsequence state", ["dynamic-programming", "binary-search"]),
  problem("1143", "longest-common-subsequence", "Longest Common Subsequence", "MEDIUM", 0.45, 45, 0.98, "two-sequence grid DP", ["dynamic-programming", "strings"]),
  problem("62", "unique-paths", "Unique Paths", "MEDIUM", -0.1, 30, 0.95, "grid path recurrence", ["dynamic-programming", "matrix"]),
  problem("139", "word-break", "Word Break", "MEDIUM", 0.35, 40, 0.97, "prefix feasibility DP", ["dynamic-programming", "strings"]),
  problem("416", "partition-equal-subset-sum", "Partition Equal Subset Sum", "MEDIUM", 0.55, 45, 0.96, "subset sum DP", ["dynamic-programming", "arrays"]),
  problem("72", "edit-distance", "Edit Distance", "HARD", 1.3, 60, 0.98, "edit-operation grid DP", ["dynamic-programming", "strings"]),
  problem("312", "burst-balloons", "Burst Balloons", "HARD", 1.75, 70, 0.97, "interval DP", ["dynamic-programming", "intervals"]),

  problem("56", "merge-intervals", "Merge Intervals", "MEDIUM", -0.1, 28, 0.99, "sorted interval sweep", ["intervals", "sorting"]),
  problem("57", "insert-interval", "Insert Interval", "MEDIUM", 0.05, 30, 0.96, "three-phase interval scan", ["intervals", "arrays"]),
  problem("435", "non-overlapping-intervals", "Non-overlapping Intervals", "MEDIUM", 0.2, 35, 0.95, "earliest-finish selection", ["greedy", "intervals"]),
  problem("55", "jump-game", "Jump Game", "MEDIUM", -0.05, 28, 0.96, "farthest reachable frontier", ["greedy", "arrays"]),
  problem("134", "gas-station", "Gas Station", "MEDIUM", 0.35, 38, 0.93, "deficit reset invariant", ["greedy", "arrays"]),

  problem("48", "rotate-image", "Rotate Image", "MEDIUM", 0.1, 32, 0.96, "transpose and reverse", ["matrix", "arrays"]),
  problem("54", "spiral-matrix", "Spiral Matrix", "MEDIUM", 0.05, 30, 0.95, "shrinking boundaries", ["matrix", "arrays"]),
  problem("73", "set-matrix-zeroes", "Set Matrix Zeroes", "MEDIUM", 0.25, 38, 0.94, "first-row marker state", ["matrix", "arrays"]),

  problem("190", "reverse-bits", "Reverse Bits", "EASY", -1.05, 20, 0.89, "shift and rebuild", ["bit-manipulation"]),
  problem("191", "number-of-1-bits", "Number of 1 Bits", "EASY", -1.25, 16, 0.91, "clear lowest set bit", ["bit-manipulation"]),
  problem("338", "counting-bits", "Counting Bits", "EASY", -0.85, 22, 0.94, "offset bit recurrence", ["bit-manipulation", "dynamic-programming"]),
  problem("371", "sum-of-two-integers", "Sum of Two Integers", "MEDIUM", 0.45, 40, 0.9, "XOR plus carry", ["bit-manipulation", "math"]),
  problem("268", "missing-number", "Missing Number", "EASY", -1.05, 18, 0.92, "XOR cancellation", ["bit-manipulation", "math"]),
];
