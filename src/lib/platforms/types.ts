import type { Platform } from "@prisma/client";

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
  raw: Record<string, string | number | null>;
};
