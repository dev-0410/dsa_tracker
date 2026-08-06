import type { ReactNode } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { cn } from "@/components/ui";

interface ProgressChartWrapperProps {
  title: string;
  description?: string;
  accessibleLabel: string;
  insight?: string;
  timeframe?: string;
  children: ReactNode;
  dataTable?: ReactNode;
  className?: string;
  chartClassName?: string;
}

export function ProgressChartWrapper({
  title,
  description,
  accessibleLabel,
  insight,
  timeframe,
  children,
  dataTable,
  className,
  chartClassName,
}: ProgressChartWrapperProps) {
  const titleId = `chart-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <figure className={cn("rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6", className)} aria-labelledby={titleId}>
      <figcaption className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id={titleId} className="text-base font-bold tracking-[-0.02em] text-ink">
            {title}
          </h2>
          {description ? <p className="mt-1 text-xs leading-5 text-muted">{description}</p> : null}
        </div>
        {timeframe ? (
          <span className="w-fit shrink-0 rounded-full border border-line bg-subtle px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
            {timeframe}
          </span>
        ) : null}
      </figcaption>

      <div role="img" aria-label={accessibleLabel} className={cn("mt-6 min-h-64 w-full", chartClassName)}>
        {children}
      </div>

      {insight ? (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-action/20 bg-action/5 p-3.5 text-sm leading-6 text-muted">
          <InformationCircleIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-action" />
          <p>
            <strong className="font-bold text-ink">Takeaway:</strong> {insight}
          </p>
        </div>
      ) : null}

      {dataTable ? (
        <details className="mt-4 border-t border-line pt-4">
          <summary className="w-fit cursor-pointer rounded text-xs font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
            View chart data
          </summary>
          <div className="mt-4 overflow-x-auto">{dataTable}</div>
        </details>
      ) : null}
    </figure>
  );
}
