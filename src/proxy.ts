import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { clientAddress } from "@/lib/request-security";

/**
 * Public profiles are intentionally cacheable, but still receive a per-client
 * guard before rendering. Deployments must ensure their reverse proxy replaces
 * (rather than appends untrusted values to) forwarding headers.
 */
export async function proxy(request: NextRequest) {
  const limit = await rateLimit(clientAddress(request), {
    namespace: "public-profile",
    limit: 180,
    windowMs: 60 * 60 * 1_000,
  });
  if (!limit.success) {
    return new NextResponse("Too many public profile requests. Try again later.", {
      status: 429,
      headers: {
        ...rateLimitHeaders(limit),
        "cache-control": "private, no-store",
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/u/:path*"],
};
