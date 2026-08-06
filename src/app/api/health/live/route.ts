import { successResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export function GET() {
  return successResponse({ status: "ok", service: "invariant-web", version: "2.0.0" });
}
