import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Invariant — Adaptive DSA Practice",
    short_name: "Invariant",
    description: "Explainable, adaptive DSA practice built around mastery, goals, and review timing.",
    start_url: "/app",
    display: "standalone",
    background_color: "#F4F3EE",
    theme_color: "#16201A",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
