import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import {
  ArrowPathIcon,
  CircleStackIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";
import { buttonStyles, cn } from "@/components/ui";

type StateIcon = "queue" | "search" | "data" | "sync" | "error" | "refresh";
type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const iconMap: Record<StateIcon, IconComponent> = {
  queue: QueueListIcon,
  search: MagnifyingGlassIcon,
  data: CircleStackIcon,
  sync: CloudArrowUpIcon,
  error: ExclamationTriangleIcon,
  refresh: ArrowPathIcon,
};

interface StateAction {
  label: string;
  href: string;
}

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: Exclude<StateIcon, "error">;
  action?: StateAction;
  secondaryAction?: StateAction;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  icon = "queue",
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  const Icon = iconMap[icon];

  return (
    <section
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface text-center",
        compact ? "px-5 py-8" : "min-h-72 px-6 py-12",
        className,
      )}
      aria-label={title}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-subtle text-muted">
        <Icon aria-hidden="true" className="h-6 w-6" />
      </span>
      <h2 className="mt-5 text-lg font-bold tracking-[-0.025em] text-ink">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
      {action || secondaryAction ? (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {action ? <Link href={action.href} className={buttonStyles()}>{action.label}</Link> : null}
          {secondaryAction ? (
            <Link href={secondaryAction.href} className={buttonStyles({ variant: "secondary" })}>
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

interface ErrorStateProps {
  title?: string;
  description: string;
  referenceId?: string;
  action?: StateAction;
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  title = "Something went wrong",
  description,
  referenceId,
  action,
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <section
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-danger/30 bg-danger/5 text-center",
        compact ? "px-5 py-8" : "min-h-64 px-6 py-12",
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <ExclamationTriangleIcon aria-hidden="true" className="h-6 w-6" />
      </span>
      <h2 className="mt-5 text-lg font-bold tracking-[-0.025em] text-ink">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
      {referenceId ? (
        <p className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          Reference {referenceId}
        </p>
      ) : null}
      {action ? (
        <Link href={action.href} className={buttonStyles({ variant: "secondary", className: "mt-6" })}>
          <ArrowPathIcon aria-hidden="true" className="h-4 w-4" />
          {action.label}
        </Link>
      ) : null}
    </section>
  );
}
