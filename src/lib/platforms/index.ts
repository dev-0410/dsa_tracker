import "server-only";

import { Platform } from "@prisma/client";
import { fetchCodeforcesStats } from "./codeforces";
import { fetchLeetCodeStats } from "./leetcode";
import type { PlatformStats } from "./types";

export type { PlatformStats } from "./types";

export function normalizePlatformHandle(handle: string) {
  return handle.trim().toLocaleLowerCase("en-US");
}

export function platformProfileUrl(platform: Platform, handle: string) {
  if (platform === Platform.LEETCODE) {
    return `https://leetcode.com/u/${encodeURIComponent(handle)}/`;
  }
  return `https://codeforces.com/profile/${encodeURIComponent(handle)}`;
}

export async function fetchPlatformStats(platform: Platform, handle: string): Promise<PlatformStats> {
  if (platform === Platform.LEETCODE) return fetchLeetCodeStats(handle);
  return fetchCodeforcesStats(handle);
}
