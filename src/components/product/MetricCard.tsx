import type { ComponentType, SVGProps } from "react";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  BoltIcon,
  CheckBadgeIcon,
  ClockIcon,
  FireIcon,
  QueueListIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/components/ui";

export type MetricIcon = "solved" | "streak" | "time" | "queue" | "mastery" | "rating" | "momentum";
export type MetricTone = "neutral" | "highlight" | "success" | "warning" | "danger" | "info";
export type MetricTrendDirection = "up" | "down" | "flat";

interface MetricTrend {
  direction: MetricTrendDirection;
  value: string;
  label?: string;
  positive?: boolean;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  helper?: string;
  icon?: MetricIcon;
  tone?: MetricTone;
  trend?: MetricTrend;
  className?: string;
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const iconMap: Record<MetricIcon, IconComponent> = {
  solved: CheckBadgeIcon,
  streak: FireIcon,
  time: ClockIcon,
  queue: QueueListIcon,
  mastery: BoltIcon,
  rating: TrophyIcon,
  momentum: ArrowUpIcon,
};

const toneClasses: Record<MetricTone, string> = {
  neutral: "bg-subtle text-muted",
  highlight: "bg-highlight text-[#16201A]",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  info: "bg-action/10 text-action",
};

const trendIcons: Record<MetricTrendDirection, IconComponent> = {
  up: ArrowUpIcon,
  down: ArrowDownIcon,
  flat: ArrowRightIcon,
};

export function MetricCard({ label, value, helper, icon = "solved", tone = "neutral", trend, className }: MetricCardProps) {
  const Icon = iconMap[icon];
  const TrendIcon = trend ? trendIcons[trend.direction] : null;

  return (
    <div className={cn("rounded-2xl border border-line bg-surface p-5 shadow-card", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", toneClasses[tone])}>
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
        {trend && TrendIcon ? (
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold",
              trend.positive === true
                ? "bg-success/10 text-success"
                : trend.positive === false
                  ? "bg-danger/10 text-danger"
                  : "bg-subtle text-muted",
            )}
          >
            <TrendIcon aria-hidden="true" className="h-3 w-3" />
            {trend.value}
          </div>
        ) : null}
      </div>
      <dl className="mt-5">
        <dt className="text-xs font-semibold text-muted">{label}</dt>
        <dd className="mt-1 font-mono text-2xl font-bold tabular-nums tracking-[-0.035em] text-ink sm:text-3xl">{value}</dd>
      </dl>
      {helper || trend?.label ? <p className="mt-2 text-xs leading-5 text-muted">{helper ?? trend?.label}</p> : null}
    </div>
  );
}
