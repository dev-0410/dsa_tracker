import Link from "next/link";
import { ArrowUpRightIcon, ClockIcon } from "@heroicons/react/24/outline";
import { Badge, cn } from "@/components/ui";
import { RecommendationReasons } from "./RecommendationReasons";
import { RecommendationImpression } from "./RecommendationImpression";
import { TrackedProblemLink } from "./TrackedProblemLink";
import {
  clamp,
  difficultyClasses,
  difficultyLabel,
  laneClasses,
  laneLabel,
  platformLabel,
} from "./product-utils";
import type { RecommendationViewModel } from "./types";

interface RecommendationRowProps {
  recommendation: RecommendationViewModel;
  className?: string;
  showReason?: boolean;
}

export function RecommendationRow({ recommendation, className, showReason = true }: RecommendationRowProps) {
  const { problem } = recommendation;
  const titleId = `recommendation-row-${recommendation.id}-title`;

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "relative grid gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-ink/25 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-5",
        className,
      )}
    >
      <RecommendationImpression itemId={recommendation.recommendationItemId} />
      <div className="flex items-center gap-2 sm:block">
        <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-subtle px-2 font-mono text-xs font-bold text-muted">
          {String(recommendation.rank).padStart(2, "0")}
        </span>
        <Badge className={cn("sm:mt-2", laneClasses[recommendation.lane])}>{laneLabel[recommendation.lane]}</Badge>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            {platformLabel[problem.platform]}
          </p>
          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-muted/50" />
          <span className="font-mono text-[10px] font-semibold text-[#607B20] dark:text-highlight">
            {Math.round(clamp(recommendation.matchPercent))}% match
          </span>
        </div>
        <h2 id={titleId} className="mt-1.5 truncate text-base font-bold tracking-[-0.02em] text-ink sm:text-lg">
          {problem.title}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge className={difficultyClasses[problem.difficulty]}>{difficultyLabel[problem.difficulty]}</Badge>
          {problem.topics.slice(0, 2).map((topic) => (
            <Badge key={topic}>{topic}</Badge>
          ))}
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
            <ClockIcon aria-hidden="true" className="h-3.5 w-3.5" />
            {problem.estimatedMinutes} min
          </span>
        </div>
        {showReason ? <RecommendationReasons reasons={recommendation.reasons} limit={1} compact className="mt-4" /> : null}
      </div>

      <div className="flex items-center gap-2 sm:justify-end">
        {recommendation.detailHref ? (
          <Link
            href={recommendation.detailHref}
            className="inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold text-muted hover:bg-subtle hover:text-ink"
          >
            Details
          </Link>
        ) : null}
        <TrackedProblemLink
          href={problem.url}
          itemId={recommendation.recommendationItemId}
          ariaLabel={`Open ${problem.title} on ${platformLabel[problem.platform]}`}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-canvas hover:bg-ink/90 dark:bg-highlight dark:text-[#16201A]"
        >
          Solve
          <ArrowUpRightIcon aria-hidden="true" className="h-4 w-4" />
        </TrackedProblemLink>
      </div>
    </article>
  );
}
