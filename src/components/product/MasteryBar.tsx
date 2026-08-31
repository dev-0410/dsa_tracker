import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ClockIcon,
} from "@heroicons/react/20/solid";
import { cn } from "@/components/ui";
import { clamp } from "./product-utils";

type MasteryTrend = "up" | "down" | "flat";

interface MasteryBarProps {
  topic: string;
  percent: number;
  attemptCount?: number;
  evidenceLabel?: string;
  nextReviewLabel?: string | null;
  trend?: MasteryTrend;
  trendLabel?: string;
  className?: string;
  compact?: boolean;
}

function getMasteryState(percent: number) {
  if (percent >= 75) {
    return { label: "Strong", barClass: "bg-success" };
  }
  if (percent >= 45) {
    return { label: "Developing", barClass: "bg-warning" };
  }
  return { label: "Focus next", barClass: "bg-danger" };
}

const trendIcons = {
  up: ArrowUpIcon,
  down: ArrowDownIcon,
  flat: ArrowRightIcon,
};

export function MasteryBar({
  topic,
  percent,
  attemptCount,
  evidenceLabel,
  nextReviewLabel,
  trend = "flat",
  trendLabel,
  className,
  compact = false,
}: MasteryBarProps) {
  const normalized = Math.round(clamp(percent));
  const state = getMasteryState(normalized);
  const TrendIcon = trendIcons[trend];

  return (
    <div className={cn("rounded-xl border border-line bg-surface", compact ? "p-4" : "p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">{topic}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="font-semibold">{state.label}</span>
            {evidenceLabel ? <span>{evidenceLabel}</span> : null}
            {!evidenceLabel && attemptCount !== undefined ? <span>{attemptCount} attempts</span> : null}
            {nextReviewLabel ? (
              <span className="inline-flex items-center gap-1">
                <ClockIcon aria-hidden="true" className="h-3.5 w-3.5" />
                {nextReviewLabel}
              </span>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-lg font-bold tabular-nums text-ink">{normalized}%</p>
          {trendLabel ? (
            <p
              className={cn(
                "mt-0.5 inline-flex items-center justify-end gap-1 text-[10px] font-semibold",
                trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-muted",
              )}
            >
              <TrendIcon aria-hidden="true" className="h-3 w-3" />
              {trendLabel}
            </p>
          ) : null}
        </div>
      </div>
      <div
        role="progressbar"
        aria-label={`${topic} mastery`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={normalized}
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-subtle"
      >
        <div className={cn("h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none", state.barClass)} style={{ width: `${normalized}%` }} />
      </div>
    </div>
  );
}
