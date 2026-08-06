import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { cn } from "@/components/ui";

export interface PageHeaderBreadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  breadcrumbs?: PageHeaderBreadcrumb[];
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  breadcrumbs,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("border-b border-line bg-surface", className)}>
      <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 sm:py-8 lg:px-8">
        {breadcrumbs?.length ? (
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted">
              {breadcrumbs.map((item, index) => (
                <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 ? <ChevronRightIcon aria-hidden="true" className="h-3.5 w-3.5 text-muted/65" /> : null}
                  {item.href ? (
                    <Link href={item.href} className="rounded underline-offset-4 hover:text-ink hover:underline">
                      {item.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-ink">
                      {item.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 max-w-3xl">
            {eyebrow ? (
              <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{eyebrow}</p>
            ) : null}
            <h1 className="text-balance text-3xl font-extrabold tracking-[-0.045em] text-ink sm:text-4xl">{title}</h1>
            {description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">{description}</p> : null}
            {meta ? <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted">{meta}</div> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </header>
  );
}
