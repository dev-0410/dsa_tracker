import { errorResponse, successResponse } from "@/lib/api-response";
import { isAuthConfigured } from "@/lib/auth";
import { db } from "@/lib/db";
import { isRedisConfigured, isRedisReady } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    database: false,
    redis: !isRedisConfigured && process.env.NODE_ENV !== "production",
    auth: isAuthConfigured,
  };
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  if (isRedisConfigured) checks.redis = await isRedisReady();
  const ready = checks.database && checks.redis && (checks.auth || process.env.NODE_ENV !== "production");
  if (!ready) return errorResponse(503, "NOT_READY", "One or more required services are unavailable.", { details: checks });
  return successResponse({ status: "ready", checks });
}
