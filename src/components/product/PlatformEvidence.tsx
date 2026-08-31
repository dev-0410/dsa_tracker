import { ArrowTopRightOnSquareIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui";

export interface PlatformEvidenceValue {
  platform: "LEETCODE" | "CODEFORCES";
  handle: string;
  profileUrl: string;
  status: "PENDING" | "ACTIVE" | "ERROR" | "MANUAL_ONLY";
  lastSyncedAt: string | null;
  stats: {
    totalSolved: number;
    easySolved: number | null;
    mediumSolved: number | null;
    hardSolved: number | null;
    rating: number | null;
    ranking: number | null;
    reputation: number | null;
    capturedAt: string;
    solvedByTag: Array<{ tagSlug: string; solved: number }>;
  } | null;
}

function tagLabel(slug: string) {
  return slug
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function PlatformEvidence({
  integration,
  timezone,
}: {
  integration: PlatformEvidenceValue;
  timezone: string;
}) {
  const label = integration.platform === "LEETCODE" ? "LeetCode" : "Codeforces";
  const stats = integration.stats;
  const syncedLabel = integration.lastSyncedAt
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: timezone,
      }).format(new Date(integration.lastSyncedAt))
    : null;
  const topTags = stats?.solvedByTag.slice(0, 8) ?? [];

  return (
    <article className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-bold text-ink">{label} evidence</p>
            <Badge variant={stats ? "success" : "warning"}>
              {stats ? <CheckCircleIcon aria-hidden="true" className="h-3.5 w-3.5" /> : null}
              {stats ? "Imported" : "Not synced"}
            </Badge>
          </div>
          <a
            href={integration.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex max-w-full items-center gap-1 font-mono text-xs font-semibold text-action hover:underline"
          >
            <span className="truncate">@{integration.handle}</span>
            <ArrowTopRightOnSquareIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          </a>
        </div>
        {stats ? (
          <div className="text-right">
            <p className="font-mono text-3xl font-bold tabular-nums tracking-[-0.04em] text-ink">
              {stats.totalSolved.toLocaleString("en-US")}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Problems solved</p>
          </div>
        ) : null}
      </div>

      {stats ? (
        <>
          {integration.platform === "LEETCODE" ? (
            <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
              {[
                ["Easy", stats.easySolved],
                ["Medium", stats.mediumSolved],
                ["Hard", stats.hardSolved],
                ["Global rank", stats.ranking ? `#${stats.ranking.toLocaleString("en-US")}` : null],
              ].map(([name, value]) => (
                <div key={name} className="bg-subtle/70 p-3 text-center">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">{name}</dt>
                  <dd className="mt-1 font-mono text-sm font-bold tabular-nums text-ink">{value ?? "—"}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
              <div className="bg-subtle/70 p-3 text-center">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Rating</dt>
                <dd className="mt-1 font-mono text-sm font-bold tabular-nums text-ink">{stats.rating ?? "—"}</dd>
              </div>
              <div className="bg-subtle/70 p-3 text-center">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Topics found</dt>
                <dd className="mt-1 font-mono text-sm font-bold tabular-nums text-ink">{stats.solvedByTag.length}</dd>
              </div>
            </dl>
          )}

          {topTags.length ? (
            <div className="mt-5 border-t border-line pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-ink">Most-practised platform topics</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Solved counts</p>
              </div>
              <ul className="mt-3 flex flex-wrap gap-2" aria-label={`${label} solved problems by topic`}>
                {topTags.map((topic) => (
                  <li key={topic.tagSlug} className="rounded-full border border-line bg-subtle px-3 py-1.5 text-xs text-muted">
                    <span className="font-semibold text-ink">{tagLabel(topic.tagSlug)}</span>{" "}
                    <span className="font-mono tabular-nums">{topic.solved}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="mt-4 text-xs leading-5 text-muted">
            {syncedLabel ? `Synced ${syncedLabel}. ` : ""}
            These public counts seed the topic estimates; logged Invariant attempts take precedence as you practise.
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm leading-6 text-muted">
          Sync this handle in Settings to import solved totals and calibrate topic mastery.
        </p>
      )}
    </article>
  );
}
