import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import {
  RecommendationCard,
  RecommendationRow,
  RefreshQueueButton,
  toRecommendationViewModel,
} from "@/components/product";
import { cn } from "@/components/ui";
import { requireCompleteUser } from "@/lib/auth";
import { getRecommendations } from "@/lib/services/recommendations";

export const dynamic = "force-dynamic";

const modes = [
  { value: "DAILY", label: "Balanced", description: "Reviews, core learning, and exploration" },
  { value: "LEARN", label: "Learn", description: "Target current mastery gaps" },
  { value: "REVIEW", label: "Review", description: "Only problems due for retrieval" },
  { value: "CHALLENGE", label: "Challenge", description: "A lower predicted solve rate" },
] as const;

type Mode = (typeof modes)[number]["value"];

export default async function RecommendationsPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const user = await requireCompleteUser();
  const requested = (await searchParams).mode?.toUpperCase();
  const mode: Mode = modes.some((option) => option.value === requested) ? (requested as Mode) : "DAILY";
  const feed = await getRecommendations({
    userId: user.id,
    experienceLevel: user.profile.experienceLevel,
    learningGoal: user.profile.learningGoal,
    targetDate: user.profile.targetDate,
    mode,
    limit: 12,
    minutesAvailable: user.profile.minutesPerDay,
  });
  const recommendations = feed.items.map(toRecommendationViewModel);

  return (
    <div>
      <PageHeader
        eyebrow="Adaptive practice queue"
        title="The next problems, ranked with evidence."
        description="Every item exposes the signals behind its position. Save useful picks, remove bad fits, and log honest outcomes so the ranking improves."
        actions={<RefreshQueueButton mode={mode} />}
        meta={<span className="font-mono uppercase tracking-[0.12em]">{feed.algorithmVersion} · generated {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(feed.generatedAt)}</span>}
      />

      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <nav aria-label="Recommendation mode" className="grid gap-2 rounded-2xl border border-line bg-surface p-2 shadow-card sm:grid-cols-4">
          {modes.map((option) => {
            const active = option.value === mode;
            return (
              <Link key={option.value} href={`/app/recommendations?mode=${option.value}`} aria-current={active ? "page" : undefined} className={cn("rounded-xl px-4 py-3 transition-colors", active ? "bg-ink text-canvas dark:bg-highlight dark:text-[#16201A]" : "hover:bg-subtle")}>
                <span className="block text-sm font-bold">{option.label}</span>
                <span className={cn("mt-1 block text-xs leading-5", active ? "text-current opacity-70" : "text-muted")}>{option.description}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-7 grid gap-6 lg:grid-cols-12">
          {recommendations[0] ? (
            <section className="lg:col-span-7" aria-labelledby="top-match">
              <p className="eyebrow" id="top-match">Top match for this mode</p>
              <RecommendationCard className="mt-3" recommendation={recommendations[0]} />
            </section>
          ) : null}
          <aside className="surface-card p-5 lg:col-span-5" aria-labelledby="ranker-note">
            <p className="eyebrow">How the ranker works</p>
            <h2 id="ranker-note" className="mt-2 text-xl font-bold tracking-[-0.03em]">Personalized without pretending to be magic.</h2>
            <div className="mt-5 space-y-4 text-sm leading-6 text-muted">
              <p><strong className="text-ink">Mastery + difficulty.</strong> A Rasch-style estimate predicts a useful success probability for each topic-weighted problem.</p>
              <p><strong className="text-ink">Memory timing.</strong> FSRS schedules solved problems back into the review lane when recall is likely to decay.</p>
              <p><strong className="text-ink">Exploration + diversity.</strong> UCB explores uncertain skills while MMR prevents one topic or pattern from filling the whole slate.</p>
            </div>
            <div className="mt-5 rounded-xl border border-line bg-subtle/70 p-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">No chatbot · no generated problem statements · no fabricated history</div>
          </aside>
        </div>

        {recommendations.length > 1 ? (
          <section className="mt-8" aria-labelledby="ranked-queue">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div><p className="eyebrow">Ranked slate</p><h2 id="ranked-queue" className="mt-1 text-xl font-bold">The rest of your queue</h2></div>
              <span className="font-mono text-xs font-semibold text-muted">{recommendations.length - 1} problems</span>
            </div>
            <div className="space-y-3">
              {recommendations.slice(1).map((recommendation) => <RecommendationRow key={recommendation.id} recommendation={recommendation} />)}
            </div>
          </section>
        ) : (
          <div className="mt-8 rounded-2xl border border-line bg-surface p-8 text-center text-sm text-muted">No additional problems match this mode right now. Log a result or switch modes to update the candidate set.</div>
        )}
      </div>
    </div>
  );
}
