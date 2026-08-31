import type { Platform } from "@prisma/client";

export type PlatformTagSolved = {
  /** Platform-native topic identifier, e.g. LeetCode's "binary-search". */
  tagSlug: string;
  solved: number;
};

export type PlatformStats = {
  platform: Platform;
  handle: string;
  profileUrl: string;
  totalSolved: number;
  easySolved: number | null;
  mediumSolved: number | null;
  hardSolved: number | null;
  rating: number | null;
  ranking: number | null;
  reputation: number | null;
  /**
   * Per-topic solved counts, when the platform exposes them. This is the only
   * platform signal detailed enough to seed per-topic mastery; aggregate totals
   * cannot distinguish 200 array problems from 200 graph problems.
   */
  solvedByTag?: PlatformTagSolved[];
  raw: Record<string, string | number | null>;
};
