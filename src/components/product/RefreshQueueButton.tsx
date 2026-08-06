"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Button } from "@/components/ui";

export function RefreshQueueButton({ mode = "DAILY" }: { mode?: "DAILY" | "LEARN" | "REVIEW" | "CHALLENGE" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const refresh = async () => {
    setPending(true);
    try {
      const response = await fetch("/api/v1/recommendations/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, limit: 12 }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? "The queue could not be refreshed.");
      toast.success("Queue refreshed with a new mix");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The queue could not be refreshed.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Button variant="secondary" onClick={() => void refresh()} disabled={pending} aria-busy={pending}>
      <ArrowPathIcon className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
      {pending ? "Re-ranking…" : "Refresh mix"}
    </Button>
  );
}
