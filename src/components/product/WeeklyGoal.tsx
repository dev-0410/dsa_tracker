import { FireIcon } from "@heroicons/react/24/outline";
import { cn } from "@/components/ui";
import { clamp } from "./product-utils";

interface WeeklyGoalProps {
  completed: number;
  target: number;
  daysActive?: number;
  streak?: number;
  weekLabel?: string;
  className?: string;
}

export function WeeklyGoal({ completed, target, daysActive, streak, weekLabel = "This week", className }: WeeklyGoalProps) {
  const safeTarget = Math.max(0, Math.round(target));
  const safeCompleted = Math.max(0, Math.round(completed));
  const percent = safeTarget > 0 ? Math.round(clamp((safeCompleted / safeTarget) * 100)) : 0;
  const remaining = Math.max(0, safeTarget - safeCompleted);

  return (
    <section aria-label="Weekly goal" className={cn("rounded-2xl border border-line bg-surface p-5 shadow-card", className)}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{weekLabel}</p>
          <h2 className="mt-1 text-lg font-bold tracking-[-0.025em] text-ink">
            Weekly goal
          </h2>
        </div>
        {streak !== undefined ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-bold text-warning">
            <FireIcon aria-hidden="true" className="h-4 w-4" />
            {streak} day streak
          </span>
        ) : null}
      </div>

      <div className="mt-6 flex items-center gap-5">
        <div
          aria-hidden="true"
          className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(rgb(var(--highlight)) ${percent}%, rgb(var(--subtle)) 0)` }}
        >
          <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-surface">
            <span className="font-mono text-2xl font-bold tabular-nums text-ink">{safeCompleted}</span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted">of {safeTarget}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <meter className="sr-only" min={0} max={Math.max(1, safeTarget)} value={Math.min(safeCompleted, Math.max(1, safeTarget))}>
            {percent}% complete
          </meter>
          <p className="text-sm font-bold text-ink">
            {remaining === 0 && safeTarget > 0 ? "Goal complete" : `${remaining} problem${remaining === 1 ? "" : "s"} to go`}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            {percent >= 100
              ? "You hit the target. Extra practice is optional, not owed."
              : percent >= 60
                ? "On pace—keep the next session realistic."
                : "A short focused session can move the week forward."}
          </p>
          {daysActive !== undefined ? (
            <p className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.13em] text-muted">
              Active {Math.max(0, daysActive)} / 7 days
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
