"use client";

import { useEffect, useRef } from "react";

export function RecommendationImpression({ itemId }: { itemId?: string | null }) {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = marker.current;
    if (!element || !itemId) return;

    const record = () => {
      void fetch("/api/v1/recommendation-events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          itemId,
          type: "IMPRESSION",
          idempotencyKey: `impression:${itemId}`,
        }),
        keepalive: true,
      }).catch(() => undefined);
    };

    if (!("IntersectionObserver" in window)) {
      record();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        record();
      },
      { threshold: 0.5 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [itemId]);

  return <span ref={marker} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-px w-px" />;
}
