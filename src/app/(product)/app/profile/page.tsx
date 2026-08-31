import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  CodeBracketIcon,
  EyeIcon,
  EyeSlashIcon,
  FlagIcon,
  IdentificationIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/app-shell";
import { MasteryBar, MetricCard, PlatformEvidence } from "@/components/product";
import { Badge, buttonStyles } from "@/components/ui";
import { requireCompleteUser } from "@/lib/auth";
import { getAnalytics } from "@/lib/services/analytics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile",
  description: "Review your DSA practice identity, goals, mastery, and connected coding platforms.",
};

const experienceLabels = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
} as const;

const goalLabels = {
  INTERVIEW_PREP: "Interview preparation",
  COMPETITIVE_PROGRAMMING: "Competitive programming",
  CORE_FUNDAMENTALS: "Core fundamentals",
  CAREER_SWITCH: "Career switch",
} as const;

const languageLabels = {
  CPP: "C++",
  JAVA: "Java",
  PYTHON: "Python",
  JAVASCRIPT: "JavaScript",
  TYPESCRIPT: "TypeScript",
  GO: "Go",
  RUST: "Rust",
} as const;

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("") || "I"
  ).toUpperCase();
}

export default async function ProfilePage() {
  const user = await requireCompleteUser();
  const analytics = await getAnalytics(user.id, user.profile.timezone, 90);
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: user.profile.timezone,
  });
  const calendarDateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const averageMastery = Math.round(analytics.summary.averageMastery * 100);
  const weakestTopic = analytics.mastery[0];
  const primaryIntegration = analytics.integrations.find((integration) => integration.stats);

  return (
    <div>
      <PageHeader
        eyebrow="Practice identity"
        title="Your profile is the context behind every recommendation."
        description="Keep your goal, available time, and coding-platform evidence current so the practice queue stays useful."
        actions={
          <>
            {user.profile.isPublic ? (
              <Link href={`/u/${user.profile.handle}`} className={buttonStyles({ variant: "secondary" })}>
                View public profile <ArrowTopRightOnSquareIcon aria-hidden="true" className="h-4 w-4" />
              </Link>
            ) : null}
            <Link href="/app/settings#profile" className={buttonStyles({ variant: "secondary" })}>
              Edit profile
            </Link>
          </>
        }
      />

      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card" aria-labelledby="profile-name">
          <div className="h-24 border-b border-line bg-subtle sm:h-32">
            <div className="h-full w-2 bg-highlight" />
          </div>
          <div className="px-5 pb-6 sm:px-7 sm:pb-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
                <div className="-mt-10 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-surface bg-ink font-mono text-2xl font-bold text-highlight shadow-card sm:-mt-12 sm:h-24 sm:w-24 sm:text-3xl dark:bg-highlight dark:text-[#16201A]">
                  {initials(user.profile.displayName)}
                </div>
                <div className="min-w-0 sm:pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id="profile-name" className="truncate text-2xl font-extrabold tracking-[-0.04em] text-ink sm:text-3xl">
                      {user.profile.displayName}
                    </h2>
                    <Badge variant={user.profile.isPublic ? "info" : "neutral"}>
                      {user.profile.isPublic ? <EyeIcon aria-hidden="true" className="h-3.5 w-3.5" /> : <EyeSlashIcon aria-hidden="true" className="h-3.5 w-3.5" />}
                      {user.profile.isPublic ? "Public" : "Private"}
                    </Badge>
                  </div>
                  <p className="mt-1 font-mono text-sm font-semibold text-muted">@{user.profile.handle}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="highlight">{experienceLabels[user.profile.experienceLevel]}</Badge>
                <Badge>{languageLabels[user.profile.preferredLanguage]}</Badge>
              </div>
            </div>

            <p className="mt-5 max-w-3xl text-sm leading-6 text-muted">
              {user.profile.bio || "Add a short bio to capture what you are working toward and make this workspace feel like yours."}
            </p>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-line bg-subtle/55 p-4">
                <dt className="flex items-center gap-2 text-xs font-semibold text-muted"><IdentificationIcon aria-hidden="true" className="h-4 w-4" />Role path</dt>
                <dd className="mt-2 text-sm font-bold text-ink">
                  {user.profile.currentRole ? `${user.profile.currentRole} → ` : "Targeting "}{user.profile.targetRole}
                </dd>
              </div>
              <div className="rounded-xl border border-line bg-subtle/55 p-4">
                <dt className="flex items-center gap-2 text-xs font-semibold text-muted"><FlagIcon aria-hidden="true" className="h-4 w-4" />Primary goal</dt>
                <dd className="mt-2 text-sm font-bold text-ink">{goalLabels[user.profile.learningGoal]}</dd>
              </div>
              <div className="rounded-xl border border-line bg-subtle/55 p-4">
                <dt className="flex items-center gap-2 text-xs font-semibold text-muted"><CalendarDaysIcon aria-hidden="true" className="h-4 w-4" />Target date</dt>
                <dd className="mt-2 text-sm font-bold text-ink">{user.profile.targetDate ? calendarDateFormatter.format(user.profile.targetDate) : "Flexible timeline"}</dd>
              </div>
              <div className="rounded-xl border border-line bg-subtle/55 p-4">
                <dt className="flex items-center gap-2 text-xs font-semibold text-muted"><CheckBadgeIcon aria-hidden="true" className="h-4 w-4" />Member since</dt>
                <dd className="mt-2 text-sm font-bold text-ink">{dateFormatter.format(user.createdAt)}</dd>
              </div>
            </dl>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label={primaryIntegration ? `${primaryIntegration.platform === "LEETCODE" ? "LeetCode" : "Codeforces"} solved` : "In-app solves"}
            value={primaryIntegration?.stats?.totalSolved ?? analytics.summary.totalSolved}
            icon="solved"
            tone="success"
            helper={primaryIntegration ? `Imported from @${primaryIntegration.handle}` : `${analytics.summary.weekSolved} this week`}
          />
          <MetricCard label="Current streak" value={`${analytics.summary.currentStreak}d`} icon="streak" tone="warning" helper="Consecutive active days" />
          <MetricCard label="Meaningful accuracy" value={`${Math.round(analytics.summary.accuracy * 100)}%`} icon="mastery" tone="info" helper="Excludes abandoned work" />
          <MetricCard label="Average mastery" value={`${averageMastery}%`} icon="momentum" tone="highlight" helper={weakestTopic ? `${weakestTopic.topic} is the next focus` : "Calibrates as you practice"} />
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <section aria-labelledby="profile-mastery-title">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Current model</p>
                <h2 id="profile-mastery-title" className="mt-1 text-xl font-bold tracking-[-0.03em] text-ink">Skill focus</h2>
              </div>
              <Link href="/app/progress" className="text-xs font-bold text-action hover:underline">Open full analysis</Link>
            </div>
            {analytics.mastery.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {analytics.mastery.slice(0, 8).map((topic) => (
                  <MasteryBar
                    key={topic.topicId}
                    topic={topic.topic}
                    percent={topic.mastery * 100}
                    attemptCount={topic.evidence === "IN_APP" ? topic.attempts : undefined}
                    evidenceLabel={topic.evidence === "PLATFORM" ? "Imported profile" : topic.evidence === "PRIOR" ? "Starting estimate" : undefined}
                    compact
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
                <CodeBracketIcon aria-hidden="true" className="mx-auto h-8 w-8 text-muted" />
                <h3 className="mt-3 text-base font-bold text-ink">Mastery is waiting for evidence</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Complete recommended problems to replace your baseline with observed topic estimates.</p>
                <Link href="/app/recommendations" className={buttonStyles({ className: "mt-5" })}>Start a practice session</Link>
              </div>
            )}
          </section>

          <section aria-labelledby="profile-platforms-title">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Imported evidence</p>
                <h2 id="profile-platforms-title" className="mt-1 text-xl font-bold tracking-[-0.03em] text-ink">Coding platforms</h2>
              </div>
              <Link href="/app/settings#platforms" className="text-xs font-bold text-action hover:underline">Manage</Link>
            </div>
            <div className="space-y-3">
              {analytics.integrations.length ? analytics.integrations.map((integration) => (
                <PlatformEvidence
                  key={integration.platform}
                  integration={integration}
                  timezone={user.profile.timezone}
                />
              )) : (
                <div className="rounded-2xl border border-dashed border-line bg-surface p-6 text-center">
                  <p className="text-sm font-bold text-ink">No coding platform connected</p>
                  <p className="mt-2 text-xs leading-5 text-muted">Connect a public handle to add external practice evidence.</p>
                  <Link href="/app/settings#platforms" className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-4" })}>Connect a platform</Link>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
