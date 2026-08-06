"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookmarkIcon, HandThumbDownIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { cn } from "@/components/ui";

type Props = { itemId: string; className?: string };

async function sendEvent(itemId: string, type: "BOOKMARKED" | "DISMISSED") {
  const response = await fetch("/api/v1/recommendation-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ itemId, type, idempotencyKey: crypto.randomUUID() }),
  });
  const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!response.ok) throw new Error(payload?.error?.message ?? "Feedback could not be saved.");
}

export function RecommendationFeedback({ itemId, className }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<"BOOKMARKED" | "DISMISSED" | null>(null);

  const act = async (type: "BOOKMARKED" | "DISMISSED") => {
    setPending(type);
    try {
      await sendEvent(itemId, type);
      toast.success(type === "BOOKMARKED" ? "Saved for later" : "Removed from this week’s queue");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Feedback could not be saved.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)} aria-label="Recommendation feedback">
      <button type="button" disabled={pending !== null} onClick={() => void act("BOOKMARKED")} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-muted hover:bg-subtle hover:text-ink disabled:opacity-50">
        <BookmarkIcon className="h-4 w-4" />{pending === "BOOKMARKED" ? "Saving…" : "Save"}
      </button>
      <button type="button" disabled={pending !== null} onClick={() => void act("DISMISSED")} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-muted hover:bg-subtle hover:text-danger disabled:opacity-50">
        <HandThumbDownIcon className="h-4 w-4" />{pending === "DISMISSED" ? "Removing…" : "Not for me"}
      </button>
    </div>
  );
}
