import type { Metadata } from "next";
import Link from "next/link";
import { AttemptOutcome, Difficulty, Prisma } from "@prisma/client";
import { subDays } from "date-fns";
import {
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  FunnelIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/app-shell";
import { EmptyState, MetricCard } from "@/components/product";
import { Badge, buttonStyles } from "@/components/ui";
import { requireCompleteUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Activity",
  description: "Review your DSA attempt history, outcomes, timing, confidence, and notes.",
};

type ActivitySearchParams = Promise<Record<string, string | string[] | undefined>>;

const PAGE_SIZE = 20;
const rangeOptions = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
  { value: 365, label: "Last year" },
] as const;

const outcomePresentation = {
  SOLVED: { label: "Solved", variant: "success" as const },
  PARTIAL: { label: "Partial", variant: "warning" as const },
  FAILED: { label: "Not solved", variant: "danger" as const },
  ABANDONED: { label: "Stopped early", variant: "neutral" as const },
};

const difficultyClasses = {
  EASY: "border-success/30 bg-success/10 text-success",
  MEDIUM: "border-warning/30 bg-warning/10 text-warning",
  HARD: "border-danger/30 bg-danger/10 text-danger",
};

const languageLabels: Record<string, string> = {
  CPP: "C++",
  JAVA: "Java",
  PYTHON: "Python",
  JAVASCRIPT: "JavaScript",
  TYPESCRIPT: "TypeScript",
  GO: "Go",
  RUST: "Rust",
};

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function enumValue<T extends string>(value: string, values: readonly T[]): T | null {
  return values.includes(value as T) ? (value as T) : null;
}

export default async function ActivityPage({ searchParams }: { searchParams: ActivitySearchParams }) {
  const user = await requireCompleteUser();
  const query = await searchParams;
  const search = firstParam(query.q).trim().slice(0, 80);
  const outcome = enumValue(firstParam(query.outcome).toUpperCase(), Object.values(AttemptOutcome));
  const difficulty = enumValue(firstParam(query.difficulty).toUpperCase(), Object.values(Difficulty));
  const requestedRange = Number(firstParam(query.range));
  const range = rangeOptions.some((option) => option.value === requestedRange) ? requestedRange : 30;
  const requestedPage = Number(firstParam(query.page));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 1000) : 1;
  const from = subDays(new Date(), range - 1);

  const problemWhere: Prisma.ProblemWhereInput = {
    ...(difficulty ? { difficulty } : {}),
    ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
  };
  const where: Prisma.AttemptWhereInput = {
    userId: user.id,
    completedAt: { gte: from },
    ...(outcome ? { outcome } : {}),
    ...(difficulty || search ? { problem: problemWhere } : {}),
  };

  const [attempts, total, groupedOutcomes, aggregate] = await Promise.all([
    db.attempt.findMany({
      where,
      orderBy: [{ completedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        problem: {
          select: {
            title: true,
            url: true,
            difficulty: true,
            platform: true,
            topics: {
              orderBy: { weight: "desc" },
              take: 3,
              include: { topic: { select: { name: true } } },
            },
          },
        },
      },
    }),
    db.attempt.count({ where }),
    db.attempt.groupBy({ by: ["outcome"], where, _count: { _all: true } }),
    db.attempt.aggregate({ where, _sum: { durationMinutes: true }, _avg: { confidence: true } }),
  ]);

  const solved = groupedOutcomes.find((group) => group.outcome === AttemptOutcome.SOLVED)?._count._all ?? 0;
  const meaningful = groupedOutcomes
    .filter((group) => group.outcome !== AttemptOutcome.ABANDONED)
    .reduce((sum, group) => sum + group._count._all, 0);
  const accuracy = meaningful ? Math.round((solved / meaningful) * 100) : 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: user.profile.timezone,
  });

  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (outcome) params.set("outcome", outcome);
    if (difficulty) params.set("difficulty", difficulty);
    params.set("range", String(range));
    params.set("page", String(targetPage));
    return `/app/activity?${params.toString()}`;
  };

  return (
    <div>
      <PageHeader
        eyebrow="Practice record"
        title="Your attempt history, without the vanity filter."
        description="Review solved and unsolved work together. Timing, hints, confidence, and notes provide the evidence that calibrates future recommendations."
        meta={<span className="font-mono uppercase tracking-[0.12em]">Times shown in {user.profile.timezone}</span>}
      />

      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Matching attempts" value={total} icon="queue" helper={`${range}-day evidence window`} />
          <MetricCard label="Solved" value={solved} icon="solved" tone="success" helper="Accepted outcomes" />
          <MetricCard label="Meaningful accuracy" value={`${accuracy}%`} icon="mastery" tone="info" helper="Excludes stopped-early sessions" />
          <MetricCard
            label="Time invested"
            value={`${Math.round((aggregate._sum.durationMinutes ?? 0) / 60)}h`}
            icon="time"
            helper={`Avg. confidence ${(aggregate._avg.confidence ?? 0).toFixed(1)} / 5`}
          />
        </div>

        <section className="mt-6 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5" aria-labelledby="activity-filters-title">
          <div className="flex items-center gap-2">
            <FunnelIcon aria-hidden="true" className="h-5 w-5 text-muted" />
            <h2 id="activity-filters-title" className="text-sm font-bold text-ink">Filter attempts</h2>
          </div>
          <form action="/app/activity" method="get" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.5fr)_repeat(3,minmax(140px,0.7fr))_auto] lg:items-end">
            <label className="text-xs font-bold text-ink">
              Problem title
              <input
                type="search"
                name="q"
                defaultValue={search}
                placeholder="Search activity…"
                maxLength={80}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink placeholder:text-muted/60 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
              />
            </label>
            <label className="text-xs font-bold text-ink">
              Outcome
              <select name="outcome" defaultValue={outcome ?? ""} className="mt-1.5 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20">
                <option value="">All outcomes</option>
                <option value="SOLVED">Solved</option>
                <option value="PARTIAL">Partial</option>
                <option value="FAILED">Not solved</option>
                <option value="ABANDONED">Stopped early</option>
              </select>
            </label>
            <label className="text-xs font-bold text-ink">
              Difficulty
              <select name="difficulty" defaultValue={difficulty ?? ""} className="mt-1.5 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20">
                <option value="">All difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </label>
            <label className="text-xs font-bold text-ink">
              Period
              <select name="range" defaultValue={range} className="mt-1.5 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20">
                {rangeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
              <button type="submit" className={buttonStyles({ className: "flex-1 lg:flex-none" })}>Apply</button>
              <Link href="/app/activity" className={buttonStyles({ variant: "ghost" })}>Reset</Link>
            </div>
          </form>
        </section>

        <section className="mt-8" aria-labelledby="attempt-list-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Evidence log</p>
              <h2 id="attempt-list-title" className="mt-1 text-xl font-bold tracking-[-0.03em] text-ink">Recent attempts</h2>
            </div>
            <span className="font-mono text-xs font-semibold text-muted">
              {total ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}` : "0 results"}
            </span>
          </div>

          {attempts.length ? (
            <ol className="space-y-3">
              {attempts.map((attempt) => {
                const outcomeView = outcomePresentation[attempt.outcome];
                return (
                  <li key={attempt.id}>
                    <article className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5" aria-labelledby={`attempt-${attempt.id}`}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={outcomeView.variant}>{outcomeView.label}</Badge>
                            <Badge className={difficultyClasses[attempt.problem.difficulty]}>
                              {attempt.problem.difficulty.charAt(0) + attempt.problem.difficulty.slice(1).toLowerCase()}
                            </Badge>
                            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                              {attempt.problem.platform === "LEETCODE" ? "LeetCode" : "Codeforces"}
                            </span>
                          </div>
                          <h3 id={`attempt-${attempt.id}`} className="mt-3 text-lg font-bold tracking-[-0.025em] text-ink">
                            <a href={attempt.problem.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1.5 hover:text-action hover:underline">
                              {attempt.problem.title}
                              <ArrowTopRightOnSquareIcon aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />
                            </a>
                          </h3>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {attempt.problem.topics.map((link) => <Badge key={link.topic.name}>{link.topic.name}</Badge>)}
                          </div>
                          {attempt.notes ? (
                            <blockquote className="mt-4 border-l-2 border-highlight pl-4 text-sm italic leading-6 text-muted">
                              “{attempt.notes}”
                            </blockquote>
                          ) : null}
                        </div>

                        <dl className="grid grid-cols-2 gap-x-5 gap-y-3 rounded-xl border border-line bg-subtle/55 p-4 text-xs sm:grid-cols-4 lg:min-w-[420px]">
                          <div>
                            <dt className="font-semibold text-muted">Completed</dt>
                            <dd className="mt-1 font-semibold text-ink">{dateFormatter.format(attempt.completedAt)}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-muted">Duration</dt>
                            <dd className="mt-1 inline-flex items-center gap-1 font-mono font-bold text-ink"><ClockIcon aria-hidden="true" className="h-3.5 w-3.5" />{attempt.durationMinutes}m</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-muted">Confidence</dt>
                            <dd className="mt-1 font-mono font-bold text-ink">{attempt.confidence} / 5</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-muted">Hints</dt>
                            <dd className="mt-1 inline-flex items-center gap-1 font-mono font-bold text-ink"><LightBulbIcon aria-hidden="true" className="h-3.5 w-3.5" />{attempt.hintsUsed}</dd>
                          </div>
                          {attempt.language ? (
                            <div className="col-span-2 sm:col-span-4">
                              <dt className="font-semibold text-muted">Language</dt>
                              <dd className="mt-1 font-semibold text-ink">{languageLabels[attempt.language] ?? attempt.language}</dd>
                            </div>
                          ) : null}
                        </dl>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
          ) : (
            <EmptyState
              icon="search"
              title="No attempts match these filters"
              description="Try a wider date range or reset the outcome and difficulty filters. New logged attempts appear here immediately."
              action={{ href: "/app/activity", label: "Reset filters" }}
              secondaryAction={{ href: "/app/recommendations", label: "Open practice queue" }}
            />
          )}

          {totalPages > 1 ? (
            <nav aria-label="Activity pagination" className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-5">
              {page > 1 ? <Link href={pageHref(page - 1)} className={buttonStyles({ variant: "secondary" })}>Previous</Link> : <span />}
              <span className="font-mono text-xs font-semibold text-muted">Page {Math.min(page, totalPages)} of {totalPages}</span>
              {page < totalPages ? <Link href={pageHref(page + 1)} className={buttonStyles({ variant: "secondary" })}>Next</Link> : <span />}
            </nav>
          ) : null}
        </section>
      </div>
    </div>
  );
}
