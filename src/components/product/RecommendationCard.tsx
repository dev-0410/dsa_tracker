import Link from "next/link";
import {
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { Badge, buttonStyles, cn } from "@/components/ui";
import { AttemptLoggingDialog } from "./AttemptLoggingDialog";
import { RecommendationReasons } from "./RecommendationReasons";
import { RecommendationFeedback } from "./RecommendationFeedback";
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

interface RecommendationCardProps {
  recommendation: RecommendationViewModel;
  className?: string;
  reasonsLimit?: number;
  showAttemptLogger?: boolean;
  attemptEndpoint?: string;
}

export function RecommendationCard({
  recommendation,
  className,
  reasonsLimit = 3,
  showAttemptLogger = true,
  attemptEndpoint,
}: RecommendationCardProps) {
  const { problem } = recommendation;
  const titleId = `recommendation-${recommendation.id}-title`;
  const match = Math.round(clamp(recommendation.matchPercent));

  return (
    <article
      aria-labelledby={titleId}
      className={cn("relative overflow-hidden rounded-2xl border border-line bg-surface shadow-card", className)}
    >
      <RecommendationImpression itemId={recommendation.recommendationItemId} />
      <div className="border-b border-line bg-subtle/55 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-ink px-1.5 font-mono text-[10px] font-bold text-highlight dark:bg-highlight dark:text-[#16201A]">
              {String(recommendation.rank).padStart(2, "0")}
            </span>
            <Badge className={laneClasses[recommendation.lane]}>{laneLabel[recommendation.lane]}</Badge>
          </div>
          <span className="font-mono text-xs font-semibold text-[#607B20] dark:text-highlight">{match}% MATCH</span>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">
              {platformLabel[problem.platform]}
            </p>
            <h2 id={titleId} className="mt-2 text-balance text-xl font-bold tracking-[-0.028em] text-ink sm:text-2xl">
              {problem.title}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge className={difficultyClasses[problem.difficulty]}>{difficultyLabel[problem.difficulty]}</Badge>
              {problem.topics.slice(0, 3).map((topic) => (
                <Badge key={topic}>{topic}</Badge>
              ))}
              <span className="inline-flex items-center gap-1.5 px-1 text-xs font-semibold text-muted">
                <ClockIcon aria-hidden="true" className="h-4 w-4" />
                {problem.estimatedMinutes} min
              </span>
              {problem.isPremium ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning">
                  <LockClosedIcon aria-hidden="true" className="h-3.5 w-3.5" />
                  Premium
                </span>
              ) : null}
            </div>
          </div>

          {recommendation.predictedSolvePercent !== undefined && recommendation.predictedSolvePercent !== null ? (
            <div className="shrink-0 rounded-xl border border-line bg-subtle px-3 py-2 text-right">
              <p className="font-mono text-lg font-bold text-ink">{Math.round(clamp(recommendation.predictedSolvePercent))}%</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">Predicted solve</p>
            </div>
          ) : null}
        </div>

        <RecommendationReasons reasons={recommendation.reasons} limit={reasonsLimit} className="mt-6" />

        <div className="mt-6 flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <TrackedProblemLink
              href={problem.url}
              itemId={recommendation.recommendationItemId}
              ariaLabel={`Open ${problem.title}`}
              className={buttonStyles({ variant: "primary", size: "md" })}
            >
              Start problem
              <ArrowTopRightOnSquareIcon aria-hidden="true" className="h-4 w-4" />
            </TrackedProblemLink>
            {showAttemptLogger ? (
              <AttemptLoggingDialog
                problem={{
                  id: problem.id,
                  title: problem.title,
                  difficulty: problem.difficulty,
                  estimatedMinutes: problem.estimatedMinutes,
                }}
                recommendationItemId={recommendation.recommendationItemId}
                endpoint={attemptEndpoint}
              />
            ) : null}
          </div>
          {recommendation.detailHref ? (
            <Link
              href={recommendation.detailHref}
              className="inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold text-muted underline-offset-4 hover:bg-subtle hover:text-ink hover:underline"
            >
              View details
            </Link>
          ) : null}
          {recommendation.recommendationItemId ? (
            <RecommendationFeedback itemId={recommendation.recommendationItemId} />
          ) : null}
        </div>
      </div>
    </article>
  );
}
