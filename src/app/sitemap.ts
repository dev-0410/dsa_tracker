import type { MetadataRoute } from "next";
import { metadataBaseUrl } from "@/lib/environment";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = metadataBaseUrl();
  return [
    { url: new URL("/", baseUrl).toString(), changeFrequency: "weekly", priority: 1 },
    { url: new URL("/privacy", baseUrl).toString(), changeFrequency: "yearly", priority: 0.2 },
    { url: new URL("/terms", baseUrl).toString(), changeFrequency: "yearly", priority: 0.2 },
  ];
}
