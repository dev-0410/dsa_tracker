import {
  CheckCircleIcon,
  ClockIcon,
  ForwardIcon,
  PlayCircleIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/app-shell";
import { EmptyState, MetricCard } from "@/components/product";
import { CreateStudyPlanDialog, StudyPlanItemActions } from "@/components/product/StudyPlanControls";
import { difficultyClasses, difficultyLabel, platformLabel } from "@/components/product/product-utils";
import { Badge, cn } from "@/components/ui";
import { requireCompleteUser } from "@/lib/auth";
import { localDateKey, getStudyPlans } from "@/lib/services/plans";
import type { StudyPlanItemStatus, StudyPlanView } from "@/lib/plans/types";

export const dynamic = "force-dynamic";

const statusLabel: Record<StudyPlanItemStatus, string> = {
  TODO: "Ready",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  SKIPPED: "Skipped",
};

const statusClasses: Record<StudyPlanItemStatus, string> = {
  TODO: "border-line bg-subtle text-muted",
  IN_PROGRESS: "border-action/25 bg-action/10 text-action",
  COMPLETED: "border-success/30 bg-success/10 text-success",
  SKIPPED: "border-warning/30 bg-warning/10 text-warning",
};

function formatDate(value: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

function rangeLabel(plan: StudyPlanView) {
  return `${formatDate(plan.startDate, { month: "short", day: "numeric" })} – ${formatDate(plan.endDate, { month: "short", day: "numeric", year: "numeric" })}`;
}

export default async function StudyPlanPage() {
  const user = await requireCompleteUser();
  const plans = await getStudyPlans({ userId: user.id, historyLimit: 4 });
  const active = plans.active;
  const today = localDateKey(new Date(), user.profile.timezone);

  return (
    <div>
      <PageHeader
        eyebrow="Adaptive study plan"
        title="A schedule that changes with your evidence."
        description="Recommendations become a realistic calendar: due reviews land early, difficult work is distributed, and completed items only count after a logged solve."
        actions={<CreateStudyPlanDialog defaultStartDate={today} hasActivePlan={Boolean(active)} />}
        meta={active ? <span className="font-mono uppercase tracking-[0.12em]">{rangeLabel(active)} · {active.progress.total} ranked problems</span> : undefined}
      />

      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {!active ? (
          <EmptyState
            title="Build your first adaptive plan"
            description="Choose a duration and daily load above. Invariant will rank real catalog problems, pull due reviews forward, and distribute the work around your daily time budget."
            icon="queue"
          />
        ) : (
          <>
            <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card" aria-labelledby="active-plan-title">
              <div className="grid gap-6 border-b border-line bg-subtle/50 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="highlight">Active plan</Badge>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{rangeLabel(active)}</span>
                  </div>
                  <h2 id="active-plan-title" className="mt-3 text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl">{active.title}</h2>
                  {active.description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{active.description}</p> : null}
                </div>
                <div className="rounded-xl border border-line bg-surface p-4">
                  <div className="flex items-end justify-between gap-4">
                    <div><p className="text-xs font-semibold text-muted">Plan progress</p><p className="mt-1 font-mono text-2xl font-bold">{active.progress.percent}%</p></div>
                    <p className="text-right text-xs font-semibold text-muted">{active.progress.completed + active.progress.skipped} of {active.progress.total}<br />items resolved</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-subtle" aria-label={`${active.progress.percent}% complete`}>
                    <div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${active.progress.percent}%` }} />
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard label="Completed" value={active.progress.completed} icon="solved" tone="success" helper="Backed by solved attempts" />
              <MetricCard label="Remaining" value={active.progress.remaining} icon="queue" tone="info" helper={`${active.progress.inProgress} currently in progress`} />
              <MetricCard label="Planned time" value={`${Math.round(active.progress.totalMinutes / 60)}h`} icon="time" helper={`${active.minutesPerDay} minute daily budget`} />
              <MetricCard label="Skipped" value={active.progress.skipped} icon="momentum" tone={active.progress.skipped ? "warning" : "neutral"} helper="Skipping never changes mastery" />
            </div>

            <section className="mt-8" aria-labelledby="plan-schedule">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div><p className="eyebrow">Daily workbench</p><h2 id="plan-schedule" className="mt-1 text-xl font-bold">Your schedule</h2></div>
                <p className="text-xs font-semibold text-muted">Log an honest result to update mastery and review timing.</p>
              </div>

              <div className="space-y-4">
                {active.days.map((day, dayIndex) => {
                  const isToday = day.date === today;
                  const isPast = day.date < today;
                  const resolved = day.completed + day.skipped;
                  const dayComplete = day.items.length > 0 && resolved === day.items.length;
                  return (
                    <section key={day.date} className={cn("overflow-hidden rounded-2xl border bg-surface shadow-card", isToday ? "border-action/45 ring-2 ring-action/10" : "border-line")} aria-labelledby={`plan-day-${day.date}`}>
                      <div className={cn("flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5", isToday ? "bg-action/5" : "bg-subtle/45")}>
                        <div className="flex items-center gap-3">
                          <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl font-mono text-xs font-bold", dayComplete ? "bg-success/10 text-success" : isToday ? "bg-action text-white" : "bg-surface text-muted")}>
                            {dayComplete ? <CheckCircleIcon className="h-5 w-5" /> : String(dayIndex + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <h3 id={`plan-day-${day.date}`} className="text-sm font-bold">{formatDate(day.date, { weekday: "long", month: "short", day: "numeric" })}</h3>
                            <p className="mt-0.5 text-xs text-muted">{isToday ? "Today" : isPast ? "Past session" : `${day.items.length} problem${day.items.length === 1 ? "" : "s"}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-semibold text-muted">
                          <span className="inline-flex items-center gap-1.5"><ClockIcon className="h-4 w-4" />{day.totalMinutes} min</span>
                          <span>{resolved}/{day.items.length} resolved</span>
                        </div>
                      </div>

                      <div className="divide-y divide-line">
                        {day.items.map((item) => (
                          <article key={item.id} className={cn("grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center", item.status === "SKIPPED" && "opacity-70")}>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{platformLabel[item.problem.platform]}</span>
                                <Badge className={statusClasses[item.status]}>{statusLabel[item.status]}</Badge>
                                <Badge className={difficultyClasses[item.problem.difficulty]}>{difficultyLabel[item.problem.difficulty]}</Badge>
                              </div>
                              <h4 className={cn("mt-2 text-base font-bold tracking-[-0.02em] sm:text-lg", item.status === "COMPLETED" && "text-muted line-through decoration-success/50")}>{item.problem.title}</h4>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
                                {item.problem.topics.slice(0, 3).map((topic) => <Badge key={topic.id}>{topic.name}</Badge>)}
                                <span className="inline-flex items-center gap-1"><ClockIcon className="h-3.5 w-3.5" />{item.problem.estimatedMinutes} min</span>
                                {item.problem.pattern ? <span className="truncate">Pattern: {item.problem.pattern}</span> : null}
                              </div>
                            </div>
                            <StudyPlanItemActions planId={active.id} item={item} defaultLanguage={user.profile.preferredLanguage} />
                          </article>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {plans.history.length ? (
          <section className="mt-10" aria-labelledby="plan-history">
            <div className="mb-4"><p className="eyebrow">Preserved progress</p><h2 id="plan-history" className="mt-1 text-xl font-bold">Plan history</h2></div>
            <div className="grid gap-3 md:grid-cols-2">
              {plans.history.map((plan) => (
                <article key={plan.id} className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                  <div className="flex items-start justify-between gap-4">
                    <div><Badge variant={plan.status === "COMPLETED" ? "success" : "neutral"}>{plan.status === "COMPLETED" ? "Completed" : "Archived"}</Badge><h3 className="mt-3 text-lg font-bold">{plan.title}</h3></div>
                    <span className="font-mono text-xl font-bold">{plan.progress.percent}%</span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-muted">{rangeLabel(plan)} · {plan.progress.completed}/{plan.progress.total} verified solves</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted">
                    <span className="inline-flex items-center gap-1"><CheckCircleIcon className="h-4 w-4 text-success" />{plan.progress.completed} done</span>
                    <span className="inline-flex items-center gap-1"><ForwardIcon className="h-4 w-4 text-warning" />{plan.progress.skipped} skipped</span>
                    <span className="inline-flex items-center gap-1"><PlayCircleIcon className="h-4 w-4 text-action" />{plan.progress.inProgress} started</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
