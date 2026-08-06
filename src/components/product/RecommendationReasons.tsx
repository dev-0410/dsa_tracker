import { BoltIcon } from "@heroicons/react/24/outline";
import { cn } from "@/components/ui";
import type { RecommendationReason } from "./types";

interface RecommendationReasonsProps {
  reasons: RecommendationReason[];
  limit?: number;
  compact?: boolean;
  className?: string;
}

export function RecommendationReasons({ reasons, limit = 3, compact = false, className }: RecommendationReasonsProps) {
  const visibleReasons = reasons.slice(0, Math.max(1, limit));

  if (visibleReasons.length === 0) return null;

  return (
    <div className={cn("border-l-2 border-highlight pl-4", className)}>
      <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
        <BoltIcon aria-hidden="true" className="h-4 w-4 text-[#708F20] dark:text-highlight" />
        Why this now
      </p>
      {compact ? (
        <p className="mt-2 text-sm leading-6 text-muted">
          <strong className="font-bold text-ink">{visibleReasons[0].label}:</strong> {visibleReasons[0].detail}
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {visibleReasons.map((reason) => (
            <li key={`${reason.label}-${reason.detail}`} className="grid gap-1 sm:grid-cols-[minmax(100px,0.32fr)_1fr_auto] sm:gap-3">
              <span className="text-xs font-bold text-ink">{reason.label}</span>
              <span className="text-xs leading-5 text-muted">{reason.detail}</span>
              {reason.contribution !== undefined ? (
                <span className="font-mono text-[10px] font-semibold text-[#607B20] dark:text-highlight">
                  {reason.contribution > 0 ? "+" : ""}
                  {reason.contribution}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
