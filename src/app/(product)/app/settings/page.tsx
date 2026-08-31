import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  KeyIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/app-shell";
import {
  AccountDataControls,
  FocusTopicsForm,
  PlatformConnections,
  ProfilePreferencesForm,
  type PlatformConnectionValue,
  type ProfilePreferencesValue,
} from "@/components/product";
import { Badge } from "@/components/ui";
import { requireCompleteUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your profile, recommendation preferences, connected coding platforms, and sign-in details.",
};

export default async function SettingsPage() {
  const user = await requireCompleteUser();
  const [identities, googleAccount, topics, topicPreferences] = await Promise.all([
    db.platformIdentity.findMany({
      where: { userId: user.id },
      orderBy: { platform: "asc" },
      include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 1 } },
    }),
    db.account.findFirst({
      where: { userId: user.id, provider: "google" },
      select: { provider: true, providerAccountId: true },
    }),
    db.topic.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, slug: true, name: true, description: true },
    }),
    db.userTopicPreference.findMany({
      where: { userId: user.id },
      orderBy: { topic: { sortOrder: "asc" } },
      select: { topicId: true },
    }),
  ]);

  const initialProfile: ProfilePreferencesValue = {
    handle: user.profile.handle,
    displayName: user.profile.displayName,
    bio: user.profile.bio ?? "",
    timezone: user.profile.timezone,
    currentRole: user.profile.currentRole ?? "",
    targetRole: user.profile.targetRole,
    experienceLevel: user.profile.experienceLevel,
    learningGoal: user.profile.learningGoal,
    weeklyTarget: user.profile.weeklyTarget,
    minutesPerDay: user.profile.minutesPerDay,
    preferredLanguage: user.profile.preferredLanguage,
    targetDate: user.profile.targetDate?.toISOString().slice(0, 10) ?? "",
    isPublic: user.profile.isPublic,
  };
  const syncFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: user.profile.timezone,
  });
  const initialConnections: PlatformConnectionValue[] = identities.map((identity) => ({
    platform: identity.platform,
    handle: identity.handle,
    profileUrl: identity.profileUrl,
    status: identity.status,
    lastSyncedLabel: identity.lastSyncedAt ? syncFormatter.format(identity.lastSyncedAt) : null,
    lastErrorCode: identity.lastErrorCode,
    stats: identity.snapshots[0]
      ? {
          totalSolved: identity.snapshots[0].totalSolved,
          easySolved: identity.snapshots[0].easySolved,
          mediumSolved: identity.snapshots[0].mediumSolved,
          hardSolved: identity.snapshots[0].hardSolved,
          rating: identity.snapshots[0].rating,
          ranking: identity.snapshots[0].ranking,
          reputation: identity.snapshots[0].reputation,
        }
      : null,
  }));

  return (
    <div>
      <PageHeader
        eyebrow="Workspace controls"
        title="Settings that keep the model honest."
        description="Update the context and imported signals used to shape your queue. Changes to practice preferences affect the next recommendation run."
        actions={user.profile.isPublic ? (
          <Link href={`/u/${user.profile.handle}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-line bg-surface px-5 text-sm font-semibold text-ink hover:border-ink hover:bg-subtle">
            View public profile <ArrowTopRightOnSquareIcon aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : undefined}
        meta={
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheckIcon aria-hidden="true" className="h-4 w-4 text-success" />
            Authenticated with Google · session stored securely
          </span>
        }
      />

      <div className="mx-auto grid w-full max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8 lg:py-8 xl:gap-10">
        <aside className="hidden lg:block" aria-label="Settings sections">
          <nav className="sticky top-6 space-y-1 rounded-2xl border border-line bg-surface p-2 shadow-card">
            <a href="#profile" className="flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-muted hover:bg-subtle hover:text-ink">Profile</a>
            <a href="#preferences" className="flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-muted hover:bg-subtle hover:text-ink">Practice preferences</a>
            <a href="#topics" className="flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-muted hover:bg-subtle hover:text-ink">Focus topics</a>
            <a href="#platforms" className="flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-muted hover:bg-subtle hover:text-ink">Platforms</a>
            <a href="#account" className="flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-muted hover:bg-subtle hover:text-ink">Account & security</a>
          </nav>
        </aside>

        <div className="min-w-0 space-y-6">
          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Settings sections">
            {[
              ["#profile", "Profile"],
              ["#preferences", "Preferences"],
              ["#topics", "Topics"],
              ["#platforms", "Platforms"],
              ["#account", "Account"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-line bg-surface px-4 text-xs font-bold text-muted shadow-card hover:text-ink">
                {label}
              </a>
            ))}
          </div>

          <ProfilePreferencesForm initialValue={initialProfile} />
          <FocusTopicsForm topics={topics} initialSelectedIds={topicPreferences.map((preference) => preference.topicId)} />
          <PlatformConnections initialConnections={initialConnections} />

          <section id="account" className="scroll-mt-8 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6" aria-labelledby="account-settings-title">
            <div className="border-b border-line pb-5">
              <p className="eyebrow">Authentication</p>
              <h2 id="account-settings-title" className="mt-1 text-xl font-bold tracking-[-0.03em] text-ink">Account & security</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Sign-in is delegated to Google. Invariant stores a revocable database session, not your Google password.</p>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <div className="flex min-w-0 items-start gap-4 rounded-xl border border-line bg-subtle/55 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-action shadow-card">
                  <KeyIcon aria-hidden="true" className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-ink">Google account</h3>
                    <Badge variant={googleAccount ? "success" : "warning"}>
                      {googleAccount ? <CheckCircleIcon aria-hidden="true" className="h-3.5 w-3.5" /> : null}
                      {googleAccount ? "Connected" : "Unavailable"}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted">{user.email ?? "No email address available"}</p>
                  <p className="mt-2 text-xs leading-5 text-muted">Thirty-day session lifetime with periodic server-side refresh and immediate invalidation when you sign out.</p>
                </div>
              </div>
              <a
                href="https://myaccount.google.com/security"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-line bg-surface px-5 text-sm font-semibold text-ink hover:border-ink hover:bg-subtle"
              >
                Manage Google security <ArrowTopRightOnSquareIcon aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
            <AccountDataControls />
          </section>
        </div>
      </div>
    </div>
  );
}
