import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowTopRightOnSquareIcon,
  ChartBarSquareIcon,
  CheckBadgeIcon,
  CodeBracketIcon,
  FlagIcon,
  IdentificationIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { PublicFooter, PublicHeader } from "@/components/marketing";
import { MasteryBar, MetricCard } from "@/components/product";
import { Badge, buttonStyles, Container, SkipLink } from "@/components/ui";
import { getPublicProfile } from "@/lib/services/public-profile";

export const dynamic = "force-dynamic";

type PublicProfileParams = Promise<{ handle: string }>;

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

const platformLabels = {
  LEETCODE: "LeetCode",
  CODEFORCES: "Codeforces",
} as const;

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("") || "I"
  ).toUpperCase();
}

function practiceTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export async function generateMetadata({ params }: { params: PublicProfileParams }): Promise<Metadata> {
  const { handle } = await params;
  const data = await getPublicProfile(handle);
  if (!data) {
    return {
      title: "Profile unavailable",
      description: "This Invariant profile is unavailable or private.",
      robots: { index: false, follow: false },
    };
  }

  const title = `${data.profile.displayName} (@${data.profile.handle})`;
  const description = data.profile.bio
    ? data.profile.bio
    : `${data.profile.displayName}'s public DSA practice profile, topic mastery, and progress on Invariant.`;
  const canonicalPath = `/u/${data.profile.handle}`;
  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },
    openGraph: {
      type: "profile",
      title: `${title} · Invariant`,
      description,
      url: canonicalPath,
      siteName: "Invariant",
      images: [
        {
          url: "/invariant-og.png",
          width: 1200,
          height: 630,
          alt: "An abstract algorithm practice path rising through graph and mastery signals",
        },
      ],
    },
    twitter: {
      card: "summary",
      title: `${title} · Invariant`,
      description,
      images: ["/invariant-og.png"],
    },
  };
}

export default async function PublicProfilePage({ params }: { params: PublicProfileParams }) {
  const { handle } = await params;
  const data = await getPublicProfile(handle);
  if (!data) notFound();

  const rolePath = data.profile.currentRole
    ? `${data.profile.currentRole} → ${data.profile.targetRole}`
    : `Working toward ${data.profile.targetRole}`;

  return (
    <div className="min-h-screen bg-[#F4F3EE] font-sans text-[#16201A] antialiased dark:bg-[#0D120F] dark:text-[#F3F6F0]">
      <SkipLink />
      <PublicHeader />
      <main id="main-content">
        <section className="relative overflow-hidden border-b border-[#D3DAD3] dark:border-[#323B34]">
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-[#C7F269]" />
          <Container className="relative py-12 sm:py-16 lg:py-20">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
              <div>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[24px] border-4 border-white bg-[#16201A] font-mono text-3xl font-bold text-[#C7F269] shadow-lift dark:border-[#273029] dark:bg-[#C7F269] dark:text-[#16201A]">
                    {getInitials(data.profile.displayName)}
                  </div>
                  <div className="min-w-0">
                    <Badge variant="success"><CheckBadgeIcon aria-hidden="true" className="h-3.5 w-3.5" />Public practice profile</Badge>
                    <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-[-0.055em] text-[#16201A] sm:text-5xl dark:text-[#F3F6F0]">
                      {data.profile.displayName}
                    </h1>
                    <p className="mt-2 font-mono text-sm font-semibold text-[#68746C] dark:text-[#A6B0A8]">@{data.profile.handle}</p>
                  </div>
                </div>

                <p className="mt-6 max-w-2xl text-base leading-7 text-[#59655D] dark:text-[#B8C1BA]">
                  {data.profile.bio || `${data.profile.displayName} is building durable problem-solving skills with deliberate, evidence-led practice.`}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge variant="highlight">{experienceLabels[data.profile.experienceLevel]}</Badge>
                  <Badge>{goalLabels[data.profile.learningGoal]}</Badge>
                  <Badge>{languageLabels[data.profile.preferredLanguage]}</Badge>
                </div>
              </div>

              <dl className="grid gap-3 rounded-2xl border border-[#D3DAD3] bg-white p-5 shadow-card dark:border-[#323B34] dark:bg-[#151B17]">
                <div className="flex items-start gap-3">
                  <IdentificationIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#3157D5] dark:text-[#7794FF]" />
                  <div><dt className="text-xs font-semibold text-[#68746C] dark:text-[#A6B0A8]">Role path</dt><dd className="mt-1 text-sm font-bold text-[#16201A] dark:text-[#F3F6F0]">{rolePath}</dd></div>
                </div>
                <div className="flex items-start gap-3 border-t border-[#D3DAD3] pt-3 dark:border-[#323B34]">
                  <FlagIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#3157D5] dark:text-[#7794FF]" />
                  <div><dt className="text-xs font-semibold text-[#68746C] dark:text-[#A6B0A8]">Primary goal</dt><dd className="mt-1 text-sm font-bold text-[#16201A] dark:text-[#F3F6F0]">{goalLabels[data.profile.learningGoal]}</dd></div>
                </div>
                <p className="border-t border-[#D3DAD3] pt-3 text-xs leading-5 text-[#68746C] dark:border-[#323B34] dark:text-[#A6B0A8]">
                  This page shares aggregate learning progress only. Attempts, notes, schedules, and account details remain private.
                </p>
              </dl>
            </div>
          </Container>
        </section>

        <Container className="py-10 sm:py-12 lg:py-16">
          <section aria-labelledby="public-progress-title">
            <div className="mb-5">
              <p className="eyebrow">Aggregate progress</p>
              <h2 id="public-progress-title" className="mt-2 text-2xl font-bold tracking-[-0.04em] text-ink sm:text-3xl">Practice, measured by evidence.</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard label="Problems solved" value={data.progress.solvedProblems} icon="solved" tone="success" helper="Unique tracked problems" />
              <MetricCard label="Attempts logged" value={data.progress.totalAttempts} icon="queue" helper="All recorded outcomes" />
              <MetricCard label="Meaningful accuracy" value={`${Math.round(data.progress.accuracy * 100)}%`} icon="mastery" tone="info" helper="Excludes abandoned sessions" />
              <MetricCard label="Focused practice" value={practiceTime(data.progress.practiceMinutes)} icon="time" tone="highlight" helper="Aggregate logged time" />
            </div>
          </section>

          <div className="mt-12 grid gap-10 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
            <section aria-labelledby="public-mastery-title">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="eyebrow">Topic model</p>
                  <h2 id="public-mastery-title" className="mt-2 text-2xl font-bold tracking-[-0.04em] text-ink">Skill mastery</h2>
                </div>
                <span className="font-mono text-xs font-semibold text-muted">Average {Math.round(data.progress.averageMastery * 100)}%</span>
              </div>
              {data.mastery.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {data.mastery.map((topic) => (
                    <MasteryBar key={topic.slug} topic={topic.name} percent={topic.mastery * 100} attemptCount={topic.attempts} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
                  <CodeBracketIcon aria-hidden="true" className="mx-auto h-8 w-8 text-muted" />
                  <h3 className="mt-3 text-base font-bold text-ink">Calibration in progress</h3>
                  <p className="mt-2 text-sm text-muted">Topic mastery will appear after enough practice evidence is available.</p>
                </div>
              )}
            </section>

            <aside aria-labelledby="public-platforms-title">
              <div className="mb-5">
                <p className="eyebrow">Public coding profiles</p>
                <h2 id="public-platforms-title" className="mt-2 text-2xl font-bold tracking-[-0.04em] text-ink">Synced public signals</h2>
              </div>
              {data.platforms.length ? (
                <div className="space-y-3">
                  {data.platforms.map((identity) => (
                    <article key={identity.platform} className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-ink">{platformLabels[identity.platform]}</h3>
                          <a href={identity.profileUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 font-mono text-xs font-semibold text-action hover:underline">
                            <span className="truncate">@{identity.handle}</span><ArrowTopRightOnSquareIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                          </a>
                        </div>
                        <Badge variant="success">Synced</Badge>
                      </div>
                      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
                        <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Solved</dt><dd className="mt-1 font-mono text-sm font-bold text-ink">{identity.stats?.totalSolved ?? "—"}</dd></div>
                        <div className="border-x border-line px-2"><dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Rating</dt><dd className="mt-1 font-mono text-sm font-bold text-ink">{identity.stats?.rating ?? "—"}</dd></div>
                        <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Rank</dt><dd className="mt-1 font-mono text-sm font-bold text-ink">{identity.stats?.ranking ? `#${identity.stats.ranking.toLocaleString("en-US")}` : "—"}</dd></div>
                      </dl>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-line bg-surface p-6 text-center">
                  <ChartBarSquareIcon aria-hidden="true" className="mx-auto h-7 w-7 text-muted" />
                  <p className="mt-3 text-sm font-bold text-ink">No public platform signal</p>
                  <p className="mt-2 text-xs leading-5 text-muted">This profile is currently based on practice tracked in Invariant.</p>
                </div>
              )}
            </aside>
          </div>

          <section className="mt-14 overflow-hidden rounded-[28px] bg-[#16201A] px-6 py-9 text-white shadow-lift sm:px-9 sm:py-10 dark:bg-[#C7F269] dark:text-[#16201A]" aria-labelledby="public-cta-title">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <p className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C7F269] dark:text-[#354313]"><SparklesIcon aria-hidden="true" className="h-4 w-4" />Adaptive DSA practice</p>
                <h2 id="public-cta-title" className="mt-3 text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl">Build a practice profile backed by real progress.</h2>
                <p className="mt-3 text-sm leading-6 text-white/70 dark:text-[#354313]">Invariant turns your goals, mastery, and available time into an explainable queue of what to solve next.</p>
              </div>
              <Link href="/login" className={buttonStyles({ variant: "highlight", size: "lg", className: "dark:border-[#16201A] dark:bg-[#16201A] dark:text-white" })}>
                Start practicing
              </Link>
            </div>
          </section>
        </Container>
      </main>
      <PublicFooter />
    </div>
  );
}
