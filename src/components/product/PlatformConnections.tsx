"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Badge, Button, cn } from "@/components/ui";

export type SettingsPlatform = "LEETCODE" | "CODEFORCES";
export type SettingsPlatformStatus = "PENDING" | "ACTIVE" | "ERROR" | "MANUAL_ONLY";

export interface PlatformConnectionValue {
  platform: SettingsPlatform;
  handle: string;
  profileUrl: string | null;
  status: SettingsPlatformStatus;
  lastSyncedLabel: string | null;
  lastErrorCode: string | null;
  stats: {
    totalSolved: number;
    rating: number | null;
    ranking: number | null;
  } | null;
}

interface PlatformConnectionsProps {
  initialConnections: PlatformConnectionValue[];
}

interface ApiIdentity {
  platform: SettingsPlatform;
  handle: string;
  profileUrl: string;
  status: SettingsPlatformStatus;
  lastErrorCode?: string | null;
}

interface ApiSnapshot {
  totalSolved?: number;
  rating?: number | null;
  ranking?: number | null;
}

interface ApiEnvelope<T> {
  data?: T;
  error?: { message?: string };
}

const supportedPlatforms: Array<{ platform: SettingsPlatform; label: string; description: string; placeholder: string }> = [
  {
    platform: "LEETCODE",
    label: "LeetCode",
    description: "Solved totals, difficulty distribution, ranking, and reputation.",
    placeholder: "leetcode_handle",
  },
  {
    platform: "CODEFORCES",
    label: "Codeforces",
    description: "Contest rating, rank, and accepted submission history.",
    placeholder: "codeforces_handle",
  },
];

const statusPresentation: Record<SettingsPlatformStatus, { label: string; variant: "neutral" | "success" | "warning" | "danger" }> = {
  PENDING: { label: "Ready to sync", variant: "warning" },
  ACTIVE: { label: "Connected", variant: "success" },
  ERROR: { label: "Needs attention", variant: "danger" },
  MANUAL_ONLY: { label: "Manual tracking", variant: "neutral" },
};

function profileUrl(platform: SettingsPlatform, handle: string): string {
  const encoded = encodeURIComponent(handle.trim());
  return platform === "LEETCODE" ? `https://leetcode.com/u/${encoded}/` : `https://codeforces.com/profile/${encoded}`;
}

function apiError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as ApiEnvelope<never>).error;
  return typeof error?.message === "string" ? error.message : fallback;
}

function dataFrom<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== "object" || !("data" in payload)) return null;
  return ((payload as ApiEnvelope<T>).data ?? null) as T | null;
}

export function PlatformConnections({ initialConnections }: PlatformConnectionsProps) {
  const router = useRouter();
  const initialByPlatform = useMemo(
    () => new Map(initialConnections.map((connection) => [connection.platform, connection])),
    [initialConnections],
  );
  const [connections, setConnections] = useState<Record<SettingsPlatform, PlatformConnectionValue | null>>({
    LEETCODE: initialByPlatform.get("LEETCODE") ?? null,
    CODEFORCES: initialByPlatform.get("CODEFORCES") ?? null,
  });
  const [handles, setHandles] = useState<Record<SettingsPlatform, string>>({
    LEETCODE: initialByPlatform.get("LEETCODE")?.handle ?? "",
    CODEFORCES: initialByPlatform.get("CODEFORCES")?.handle ?? "",
  });
  const [pending, setPending] = useState<Record<SettingsPlatform, "save" | "sync" | null>>({
    LEETCODE: null,
    CODEFORCES: null,
  });
  const [errors, setErrors] = useState<Record<SettingsPlatform, string | null>>({ LEETCODE: null, CODEFORCES: null });

  const setPlatformError = (platform: SettingsPlatform, message: string | null) => {
    setErrors((current) => ({ ...current, [platform]: message }));
  };

  const saveHandle = async (platform: SettingsPlatform) => {
    const handle = handles[platform].trim();
    if (!handle) {
      setPlatformError(platform, "Enter a public handle before saving.");
      return;
    }

    setPending((current) => ({ ...current, [platform]: "save" }));
    setPlatformError(platform, null);
    try {
      const response = await fetch(`/api/v1/me/platforms/${platform.toLowerCase()}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) throw new Error(apiError(payload, "The platform handle could not be saved."));
      const identity = dataFrom<ApiIdentity>(payload);
      const savedHandle = identity?.handle ?? handle;
      setHandles((current) => ({ ...current, [platform]: savedHandle }));
      setConnections((current) => ({
        ...current,
        [platform]: {
          platform,
          handle: savedHandle,
          profileUrl: identity?.profileUrl ?? profileUrl(platform, savedHandle),
          status: identity?.status ?? "PENDING",
          lastSyncedLabel: current[platform]?.lastSyncedLabel ?? null,
          lastErrorCode: identity?.lastErrorCode ?? null,
          stats: current[platform]?.stats ?? null,
        },
      }));
      toast.success(`${platform === "LEETCODE" ? "LeetCode" : "Codeforces"} handle saved. Sync when ready.`);
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The platform handle could not be saved.";
      setPlatformError(platform, message);
      toast.error(message);
    } finally {
      setPending((current) => ({ ...current, [platform]: null }));
    }
  };

  const syncPlatform = async (platform: SettingsPlatform) => {
    const connection = connections[platform];
    if (!connection || handles[platform].trim() !== connection.handle) {
      setPlatformError(platform, "Save this handle before syncing it.");
      return;
    }

    setPending((current) => ({ ...current, [platform]: "sync" }));
    setPlatformError(platform, null);
    try {
      const response = await fetch(`/api/v1/me/platforms/${platform.toLowerCase()}/sync`, { method: "POST" });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) throw new Error(apiError(payload, "The platform could not be synced."));
      const result = dataFrom<{ identity?: ApiIdentity; snapshot?: ApiSnapshot; cached?: boolean }>(payload);
      const snapshot = result?.snapshot;
      setConnections((current) => ({
        ...current,
        [platform]: current[platform]
          ? {
              ...current[platform],
              status: "ACTIVE",
              profileUrl: result?.identity?.profileUrl ?? current[platform]?.profileUrl ?? null,
              lastSyncedLabel: result?.cached ? "Recently synced" : "Just now",
              lastErrorCode: null,
              stats: snapshot
                ? {
                    totalSolved: snapshot.totalSolved ?? current[platform]?.stats?.totalSolved ?? 0,
                    rating: snapshot.rating ?? current[platform]?.stats?.rating ?? null,
                    ranking: snapshot.ranking ?? current[platform]?.stats?.ranking ?? null,
                  }
                : current[platform]?.stats ?? null,
            }
          : null,
      }));
      toast.success(result?.cached ? "Recent platform data is already current." : "Platform activity synced.");
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The platform could not be synced.";
      setPlatformError(platform, message);
      setConnections((current) => ({
        ...current,
        [platform]: current[platform] ? { ...current[platform], status: "ERROR" } : null,
      }));
      toast.error(message);
    } finally {
      setPending((current) => ({ ...current, [platform]: null }));
    }
  };

  return (
    <section id="platforms" className="scroll-mt-8 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6" aria-labelledby="platform-connections-title">
      <div className="border-b border-line pb-5">
        <p className="eyebrow">Imported practice signal</p>
        <h2 id="platform-connections-title" className="mt-1 text-xl font-bold tracking-[-0.03em] text-ink">
          Platform connections
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">Handles are saved first, then their public stats are checked through an explicit sync. Private credentials are never requested.</p>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {supportedPlatforms.map((item) => {
          const connection = connections[item.platform];
          const handle = handles[item.platform];
          const status = statusPresentation[connection?.status ?? "PENDING"];
          const busy = pending[item.platform];
          const hasUnsavedHandle = Boolean(connection && handle.trim() !== connection.handle);

          return (
            <article key={item.platform} className="rounded-2xl border border-line bg-subtle/35 p-4 sm:p-5" aria-labelledby={`${item.platform}-title`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 id={`${item.platform}-title`} className="text-base font-bold text-ink">{item.label}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted">{item.description}</p>
                </div>
                {connection ? <Badge variant={status.variant}>{status.label}</Badge> : <Badge>Not connected</Badge>}
              </div>

              <label className="mt-5 block text-sm font-bold text-ink">
                Public handle
                <input
                  value={handle}
                  onChange={(event) => {
                    setHandles((current) => ({ ...current, [item.platform]: event.target.value }));
                    setPlatformError(item.platform, null);
                  }}
                  maxLength={64}
                  pattern="[A-Za-z0-9_.-]+"
                  placeholder={item.placeholder}
                  disabled={Boolean(busy)}
                  className="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm font-semibold text-ink placeholder:text-muted/60 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20 disabled:cursor-wait disabled:opacity-60"
                />
              </label>

              {connection?.stats ? (
                <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-line bg-surface p-3 text-center">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Solved</dt>
                    <dd className="mt-1 font-mono text-sm font-bold text-ink">{connection.stats.totalSolved}</dd>
                  </div>
                  <div className="border-x border-line px-2">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Rating</dt>
                    <dd className="mt-1 font-mono text-sm font-bold text-ink">{connection.stats.rating ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">Ranking</dt>
                    <dd className="mt-1 font-mono text-sm font-bold text-ink">
                      {connection.stats.ranking ? `#${connection.stats.ranking.toLocaleString("en-US")}` : "—"}
                    </dd>
                  </div>
                </dl>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
                {connection?.lastSyncedLabel ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircleIcon aria-hidden="true" className="h-4 w-4 text-success" />
                    Last synced {connection.lastSyncedLabel}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <CloudArrowUpIcon aria-hidden="true" className="h-4 w-4" />
                    No successful sync yet
                  </span>
                )}
                {connection?.profileUrl && !hasUnsavedHandle ? (
                  <a
                    href={connection.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-action hover:underline"
                  >
                    View profile <ArrowTopRightOnSquareIcon aria-hidden="true" className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>

              {errors[item.platform] ? (
                <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3 text-xs leading-5 text-danger">
                  <ExclamationTriangleIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  {errors[item.platform]}
                </div>
              ) : null}

              <div className="mt-5 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void saveHandle(item.platform)}
                  disabled={Boolean(busy) || !handle.trim() || (!hasUnsavedHandle && Boolean(connection))}
                >
                  {busy === "save" ? "Saving…" : connection ? "Save handle" : "Connect handle"}
                </Button>
                <Button
                  type="button"
                  onClick={() => void syncPlatform(item.platform)}
                  disabled={Boolean(busy) || !connection || hasUnsavedHandle}
                >
                  <ArrowPathIcon aria-hidden="true" className={cn("h-4 w-4", busy === "sync" && "animate-spin motion-reduce:animate-none")} />
                  {busy === "sync" ? "Syncing…" : "Sync now"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
