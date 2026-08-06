import Link from "next/link";
import { ArrowRightIcon, CalendarDaysIcon, ClockIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/app-shell";
import {
  ActivityHeatmap,
  EmptyState,
  MasteryBar,
  MetricCard,
  RecommendationCard,
  RecommendationRow,
  WeeklyGoal,
  toRecommendationViewModel,
} from "@/components/product";
import { buttonStyles } from "@/components/ui";
import { requireCompleteUser } from "@/lib/auth";
import { getAnalytics } from "@/lib/services/analytics";
import { getRecommendations } from "@/lib/services/recommendations";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const user = await requireCompleteUser();
  const [analytics, feed] = await Promise.all([
    getAnalytics(user.id, user.profile.timezone, 30),
    getRecommendations({
      userId: user.id,
      experienceLevel: user.profile.experienceLevel,
      learningGoal: user.profile.learningGoal,
      targetDate: user.profile.targetDate,
      mode: "DAILY",
      limit: Math.min(8, Math.max(4, user.profile.weeklyTarget)),
      minutesAvailable: user.profile.minutesPerDay,
    }),
  ]);
  const recommendations = feed.items.map(toRecommendationViewModel);
  const primary = recommendations[0];
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: user.profile.timezone,
  }).format(new Date());
  const activeDays = analytics.series.slice(-7).filter((day) => day.attempted > 0).length;

  return (
    <div>
      <PageHeader
        eyebrow={dateLabel}
        title={`Good to see you, ${user.profile.displayName.split(" ")[0]}.`}
        description="Your queue balances the skills that need work, reviews that are due, and the time you have today."
        meta={
          <>
            <span className="inline-flex items-center gap-1.5"><ClockIcon className="h-4 w-4" />{user.profile.minutesPerDay} minute session</span>
            <span className="inline-flex items-center gap-1.5"><CalendarDaysIcon className="h-4 w-4" />{user.profile.weeklyTarget} problems this week</span>
          </>
        }
        actions={
          <Link href="/app/recommendations" className={buttonStyles({ variant: "secondary" })}>
            Open full queue <ArrowRightIcon className="h-4 w-4" />
          </Link>
        }
      />

      <div className="mx-auto grid w-full max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-8">
        <section className="space-y-6 lg:col-span-8" aria-labelledby="next-problem-title">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Your next best problem</p>
              <h2 id="next-problem-title" className="mt-2 text-2xl font-bold tracking-[-0.035em]">One useful step, with the reasoning visible.</h2>
            </div>
            <span className="hidden font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted sm:block">{feed.algorithmVersion}</span>
          </div>
          {primary ? (
            <RecommendationCard recommendation={primary} />
          ) : (
            <EmptyState
              title="Your queue is clear"
              description="There are no eligible problems in today’s lane. Try another mode or return after your next review becomes due."
              action={{ label: "Explore queue modes", href: "/app/recommendations" }}
              secondaryAction={{ label: "Review progress", href: "/app/progress" }}
            />
          )}

          {recommendations.length > 1 ? (
            <div>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-lg font-bold tracking-[-0.025em]">Later in this session</h2>
                <span className="font-mono text-xs font-semibold text-muted">{recommendations.length - 1} remaining</span>
              </div>
              <div className="space-y-3">
                {recommendations.slice(1, 4).map((recommendation) => (
                  <RecommendationRow key={recommendation.id} recommendation={recommendation} />
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <aside className="space-y-6 lg:col-span-4" aria-label="Weekly practice summary">
          <WeeklyGoal
            completed={analytics.summary.weekSolved}
            target={user.profile.weeklyTarget}
            daysActive={activeDays}
            streak={analytics.summary.currentStreak}
          />
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Reviews due" value={analytics.summary.dueReviews} icon="queue" tone={analytics.summary.dueReviews ? "warning" : "success"} helper={analytics.summary.dueReviews ? "Included in your queue" : "Nothing overdue"} />
            <MetricCard label="Accuracy" value={`${Math.round(analytics.summary.accuracy * 100)}%`} icon="mastery" tone="info" helper="Meaningful attempts" />
            <MetricCard label="Solved total" value={analytics.summary.totalSolved} icon="solved" tone="success" helper="Tracked by Invariant" />
            <MetricCard label="Avg. solve" value={`${analytics.summary.averageSolveMinutes}m`} icon="time" helper="Accepted attempts" />
          </div>

          <section className="surface-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Current skill gaps</p>
                <h2 className="mt-1 text-lg font-bold">Focus map</h2>
              </div>
              <Link href="/app/progress" className="text-xs font-bold text-action hover:underline">Full analysis</Link>
            </div>
            <div className="mt-4 space-y-3">
              {analytics.mastery.slice(0, 3).map((topic) => (
                <MasteryBar key={topic.topicId} topic={topic.topic} percent={topic.mastery * 100} attemptCount={topic.attempts} compact />
              ))}
            </div>
          </section>
        </aside>

        <ActivityHeatmap
          className="lg:col-span-12"
          data={analytics.heatmap.map((day) => ({ date: day.date, count: day.attempted, solved: day.solved, minutes: day.minutes }))}
          maxWeeks={12}
        />
      </div>
    </div>
  );
}
