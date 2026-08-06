import type { MetadataRoute } from "next";
import { metadataBaseUrl } from "@/lib/environment";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/u/"],
      disallow: ["/api/", "/app/", "/login", "/onboarding"],
    },
    sitemap: new URL("/sitemap.xml", metadataBaseUrl()).toString(),
  };
}
