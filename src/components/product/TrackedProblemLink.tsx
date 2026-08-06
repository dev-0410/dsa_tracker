"use client";

import type { ReactNode } from "react";

type Props = {
  href: string;
  itemId?: string | null;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
};

export function TrackedProblemLink({ href, itemId, className, ariaLabel, children }: Props) {
  const recordOpen = () => {
    if (!itemId) return;
    void fetch("/api/v1/recommendation-events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        itemId,
        type: "OPENED",
        idempotencyKey: `open:${itemId}:${crypto.randomUUID()}`,
      }),
      keepalive: true,
    }).catch(() => undefined);
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={className}
      onClick={recordOpen}
    >
      {children}
    </a>
  );
}
