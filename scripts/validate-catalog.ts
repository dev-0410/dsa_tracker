import { z } from "zod";
import { prerequisiteSeeds, problemSeeds, topicSeeds } from "../prisma/catalog";

const topicSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(2),
  description: z.string().min(12),
  sortOrder: z.number().int().nonnegative(),
});

const problemSchema = z.object({
  externalId: z.string().regex(/^\d+$/),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(2),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  difficultyB: z.number().min(-3).max(3),
  estimatedMinutes: z.number().int().min(10).max(120),
  qualityScore: z.number().min(0).max(1),
  pattern: z.string().min(3),
  topics: z.tuple([z.string()]).rest(z.string()).refine((topics) => new Set(topics).size === topics.length),
});

const parsedTopics = z.array(topicSchema).min(12).parse(topicSeeds);
const parsedProblems = z.array(problemSchema).min(60).parse(problemSeeds);
const topicSlugs = new Set(parsedTopics.map((topic) => topic.slug));

function assertUnique(values: string[], label: string) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length) throw new Error(`Duplicate ${label}: ${[...new Set(duplicates)].join(", ")}`);
}

assertUnique(parsedTopics.map((topic) => topic.slug), "topic slug");
assertUnique(parsedProblems.map((problem) => problem.externalId), "external problem id");
assertUnique(parsedProblems.map((problem) => problem.slug), "problem slug");

for (const problem of parsedProblems) {
  for (const topic of problem.topics) {
    if (!topicSlugs.has(topic)) throw new Error(`${problem.slug} references unknown topic ${topic}`);
  }
  const url = new URL(`https://leetcode.com/problems/${problem.slug}/`);
  if (url.hostname !== "leetcode.com" || !url.pathname.endsWith("/")) {
    throw new Error(`Invalid problem URL for ${problem.slug}`);
  }
}

const edges = new Map<string, string[]>();
for (const [topic, prerequisite] of prerequisiteSeeds) {
  if (!topicSlugs.has(topic) || !topicSlugs.has(prerequisite)) {
    throw new Error(`Unknown prerequisite edge ${topic} -> ${prerequisite}`);
  }
  edges.set(topic, [...(edges.get(topic) ?? []), prerequisite]);
}

const visiting = new Set<string>();
const visited = new Set<string>();
function visit(topic: string) {
  if (visiting.has(topic)) throw new Error(`Prerequisite cycle detected at ${topic}`);
  if (visited.has(topic)) return;
  visiting.add(topic);
  for (const dependency of edges.get(topic) ?? []) visit(dependency);
  visiting.delete(topic);
  visited.add(topic);
}
for (const topic of topicSlugs) visit(topic);

const difficultyCounts = Object.fromEntries(
  ["EASY", "MEDIUM", "HARD"].map((difficulty) => [
    difficulty,
    parsedProblems.filter((problem) => problem.difficulty === difficulty).length,
  ]),
);

if (difficultyCounts.EASY < 15 || difficultyCounts.MEDIUM < 35 || difficultyCounts.HARD < 8) {
  throw new Error(`Catalog difficulty coverage is too thin: ${JSON.stringify(difficultyCounts)}`);
}

console.info(
  `Catalog valid: ${parsedProblems.length} problems, ${parsedTopics.length} topics (${JSON.stringify(difficultyCounts)}).`,
);
