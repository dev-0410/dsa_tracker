import { ApiError, handleApiError, requestIdFrom } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 250;

function ndjson(value: unknown) {
  return `${JSON.stringify(value)}\n`;
}

export async function GET(request: Request) {
  try {
    const current = await requireUser();
    const limit = await rateLimit(current.id, {
      namespace: "account-export",
      limit: 3,
      windowMs: 24 * 60 * 60 * 1_000,
    });
    if (!limit.success) {
      throw new ApiError(429, "RATE_LIMITED", "You can download three account exports per day.", {
        headers: rateLimitHeaders(limit),
      });
    }

    const requestId = requestIdFrom(request);
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit = (type: string, data: unknown) => {
          controller.enqueue(encoder.encode(ndjson({ type, data })));
        };
        const emitPages = async <T extends { id: string }>(
          type: string,
          fetchPage: (cursor: string | undefined) => Promise<T[]>,
        ) => {
          let cursor: string | undefined;
          while (true) {
            const page = await fetchPage(cursor);
            for (const record of page) emit(type, record);
            if (page.length < PAGE_SIZE) break;
            cursor = page.at(-1)?.id;
            if (!cursor) break;
          }
        };

        try {
          const user = await db.user.findUniqueOrThrow({
            where: { id: current.id },
            select: {
              id: true,
              name: true,
              email: true,
              emailVerified: true,
              image: true,
              lastLoginAt: true,
              createdAt: true,
              updatedAt: true,
              profile: true,
              accounts: { select: { provider: true, providerAccountId: true, type: true } },
              topicPreferences: { include: { topic: true } },
              topicMastery: { include: { topic: true } },
            },
          });
          emit("manifest", {
            format: "invariant-account-export",
            version: 2,
            encoding: "ndjson",
            exportedAt: new Date(),
            requestId,
          });
          emit("user", user);

          await emitPages("platform_identity", (cursor) =>
            db.platformIdentity.findMany({
              where: { userId: current.id },
              orderBy: { id: "asc" },
              take: PAGE_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            }),
          );
          await emitPages("platform_snapshot", (cursor) =>
            db.platformSnapshot.findMany({
              where: { identity: { userId: current.id } },
              orderBy: { id: "asc" },
              take: PAGE_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            }),
          );
          await emitPages("problem_state", (cursor) =>
            db.userProblemState.findMany({
              where: { userId: current.id },
              orderBy: { id: "asc" },
              take: PAGE_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            }),
          );
          await emitPages("attempt", (cursor) =>
            db.attempt.findMany({
              where: { userId: current.id },
              orderBy: { id: "asc" },
              take: PAGE_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            }),
          );
          await emitPages("recommendation_run", (cursor) =>
            db.recommendationRun.findMany({
              where: { userId: current.id },
              orderBy: { id: "asc" },
              take: PAGE_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            }),
          );
          await emitPages("recommendation_item", (cursor) =>
            db.recommendationItem.findMany({
              where: { run: { userId: current.id } },
              orderBy: { id: "asc" },
              take: PAGE_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            }),
          );
          await emitPages("recommendation_event", (cursor) =>
            db.recommendationEvent.findMany({
              where: { userId: current.id },
              orderBy: { id: "asc" },
              take: PAGE_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            }),
          );
          await emitPages("study_plan", (cursor) =>
            db.studyPlan.findMany({
              where: { userId: current.id },
              orderBy: { id: "asc" },
              take: PAGE_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            }),
          );
          await emitPages("study_plan_item", (cursor) =>
            db.studyPlanItem.findMany({
              where: { plan: { userId: current.id } },
              orderBy: { id: "asc" },
              take: PAGE_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            }),
          );
          await emitPages("daily_activity", (cursor) =>
            db.dailyActivity.findMany({
              where: { userId: current.id },
              orderBy: { id: "asc" },
              take: PAGE_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            }),
          );
          await emitPages("problem_catalog", (cursor) =>
            db.problem.findMany({
              orderBy: { id: "asc" },
              take: PAGE_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
              include: { topics: { include: { topic: true } } },
            }),
          );
          emit("complete", { exportedAt: new Date() });
          controller.close();
        } catch (error) {
          console.error("[account-export:error]", { requestId, error });
          controller.error(error);
        }
      },
    });

    const headers = new Headers(rateLimitHeaders(limit));
    headers.set("cache-control", "no-store");
    headers.set("content-type", "application/x-ndjson; charset=utf-8");
    headers.set("content-disposition", `attachment; filename="invariant-export-${new Date().toISOString().slice(0, 10)}.ndjson"`);
    headers.set("x-request-id", requestId);
    return new Response(stream, { status: 200, headers });
  } catch (error) {
    return handleApiError(error, request);
  }
}
