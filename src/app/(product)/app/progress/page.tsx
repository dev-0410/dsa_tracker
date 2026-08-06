import { PageHeader } from "@/components/app-shell";
import {
  ActivityHeatmap,
  DifficultyProgressChart,
  MasteryBar,
  MetricCard,
  ProgressChartWrapper,
  SolveTrendChart,
} from "@/components/product";
import { requireCompleteUser } from "@/lib/auth";
import { getAnalytics } from "@/lib/services/analytics";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const user = await requireCompleteUser();
  const analytics = await getAnalytics(user.id, user.profile.timezone, 90);
  const generatedAt = new Date(analytics.generatedAt);
  const recent = analytics.series.slice(-30);
  const strongest = analytics.mastery.at(-1);
  const weakest = analytics.mastery[0];

  return (
    <div>
      <PageHeader
        eyebrow="Mastery, consistency, retention"
        title="Progress that tells you what to do next."
        description="Totals are useful, but calibration is better. These views connect practice volume to accuracy, topic mastery, and review timing."
        meta={<span className="font-mono uppercase tracking-[0.12em]">90-day evidence window · updated {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: user.profile.timezone }).format(generatedAt)}</span>}
      />

      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Problems solved" value={analytics.summary.totalSolved} icon="solved" tone="success" helper={`${analytics.summary.weekSolved} this week`} />
          <MetricCard label="Current streak" value={`${analytics.summary.currentStreak}d`} icon="streak" tone="warning" helper="Consecutive active days" />
          <MetricCard label="Attempt accuracy" value={`${Math.round(analytics.summary.accuracy * 100)}%`} icon="mastery" tone="info" helper="Solved ÷ meaningful attempts" />
          <MetricCard label="Average mastery" value={`${Math.round(analytics.summary.averageMastery * 100)}%`} icon="momentum" tone="highlight" helper="Across calibrated topics" />
        </div>

        <section className="mt-6 rounded-2xl border border-action/20 bg-action/5 p-5 sm:p-6" aria-labelledby="progress-insight">
          <p className="eyebrow">Current takeaway</p>
          <h2 id="progress-insight" className="mt-2 text-xl font-bold tracking-[-0.03em]">{analytics.insight.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{analytics.insight.detail}</p>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <ProgressChartWrapper
            title="Problems solved"
            description="Accepted attempts over the most recent 30 days"
            accessibleLabel={`Line chart showing ${recent.reduce((sum, point) => sum + point.solved, 0)} solves over 30 days`}
            timeframe="30 days"
            insight={recent.slice(-7).reduce((sum, point) => sum + point.solved, 0) > 0 ? "Recent practice is creating fresh evidence for the ranker." : "A short session this week will restart calibration and streak data."}
            dataTable={
              <table className="w-full text-left text-xs"><thead><tr className="border-b border-line"><th className="p-2">Date</th><th className="p-2">Attempted</th><th className="p-2">Solved</th><th className="p-2">Minutes</th></tr></thead><tbody>{recent.map((point) => <tr key={point.date} className="border-b border-line/60"><td className="p-2 font-mono">{point.date}</td><td className="p-2">{point.attempted}</td><td className="p-2">{point.solved}</td><td className="p-2">{point.minutes}</td></tr>)}</tbody></table>
            }
          >
            <SolveTrendChart data={recent} />
          </ProgressChartWrapper>

          <ProgressChartWrapper
            title="Difficulty progression"
            description="Attempts and successful solves by catalog difficulty"
            accessibleLabel="Bar chart comparing attempted and solved problems at easy, medium, and hard difficulty"
            timeframe="90 days"
            insight={strongest ? `${strongest.topic} is currently your strongest calibrated topic at ${Math.round(strongest.mastery * 100)}% mastery.` : "Difficulty calibration begins after your first logged attempt."}
            dataTable={<table className="w-full text-left text-xs"><thead><tr className="border-b border-line"><th className="p-2">Difficulty</th><th className="p-2">Attempted</th><th className="p-2">Solved</th><th className="p-2">Accuracy</th></tr></thead><tbody>{analytics.difficulty.map((row) => <tr key={row.difficulty} className="border-b border-line/60"><td className="p-2">{row.difficulty}</td><td className="p-2">{row.attempted}</td><td className="p-2">{row.solved}</td><td className="p-2">{Math.round(row.accuracy * 100)}%</td></tr>)}</tbody></table>}
          >
            <DifficultyProgressChart data={analytics.difficulty} />
          </ProgressChartWrapper>
        </div>

        <ActivityHeatmap className="mt-6" data={analytics.heatmap.map((day) => ({ date: day.date, count: day.attempted, solved: day.solved, minutes: day.minutes }))} maxWeeks={12} />

        <section className="mt-8" aria-labelledby="topic-mastery">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><p className="eyebrow">IRT topic estimates</p><h2 id="topic-mastery" className="mt-1 text-xl font-bold">Topic mastery</h2></div>
            {weakest ? <span className="text-xs font-semibold text-muted">Lowest estimate: {weakest.topic} · {Math.round(weakest.mastery * 100)}%</span> : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {analytics.mastery.map((topic) => (
              <MasteryBar key={topic.topicId} topic={topic.topic} percent={topic.mastery * 100} attemptCount={topic.attempts} nextReviewLabel={topic.nextReviewAt ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(Math.ceil((new Date(topic.nextReviewAt).getTime() - generatedAt.getTime()) / 86_400_000), "day") : null} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
