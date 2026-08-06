"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Button } from "@/components/ui";

interface ApiEnvelope {
  error?: { message?: string };
}

function apiError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const message = (payload as ApiEnvelope).error?.message;
  return typeof message === "string" ? message : fallback;
}

function exportFilename(disposition: string | null): string {
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? `invariant-export-${new Date().toISOString().slice(0, 10)}.ndjson`;
}

export function AccountDataControls() {
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadExport = async () => {
    setIsDownloading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/me/export", { method: "GET" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as unknown;
        throw new Error(apiError(payload, "Your account export could not be prepared."));
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = exportFilename(response.headers.get("content-disposition"));
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
      toast.success("Account export downloaded.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Your account export could not be prepared.";
      setError(message);
      toast.error(message);
    } finally {
      setIsDownloading(false);
    }
  };

  const deleteAccount = async () => {
    if (confirmation !== "DELETE") return;
    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/me/account", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) throw new Error(apiError(payload, "Your account could not be deleted."));
      toast.success("Your Invariant account has been deleted.");
      await signOut({ callbackUrl: "/" }).catch(() => {
        router.push("/");
        router.refresh();
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Your account could not be deleted.";
      setError(message);
      toast.error(message);
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDelete(false);
    setConfirmation("");
    setError(null);
  };

  return (
    <div className="mt-6 border-t border-line pt-6">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-line bg-subtle/45 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-action shadow-card">
              <ArrowDownTrayIcon aria-hidden="true" className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-ink">Download your data</h3>
              <p className="mt-1 text-xs leading-5 text-muted">Get a streaming NDJSON copy of your profile, attempts, recommendations, plans, and connected-platform history.</p>
              <Button type="button" variant="secondary" size="sm" onClick={() => void downloadExport()} disabled={isDownloading} aria-busy={isDownloading} className="mt-4">
                <ArrowDownTrayIcon aria-hidden="true" className="h-4 w-4" />
                {isDownloading ? "Preparing…" : "Download export"}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
              <TrashIcon aria-hidden="true" className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-ink">Delete account</h3>
              <p className="mt-1 text-xs leading-5 text-muted">Permanently remove your profile, practice history, sessions, and connected data. This cannot be undone.</p>
              {!showDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDelete(true);
                    setError(null);
                  }}
                  aria-expanded="false"
                  aria-controls="delete-account-confirmation"
                  className="mt-4 text-danger hover:bg-danger/10 hover:text-danger"
                >
                  Delete my account
                </Button>
              ) : (
                <div id="delete-account-confirmation" className="mt-4 border-t border-danger/20 pt-4">
                  <label htmlFor="delete-account-text" className="text-xs font-bold text-ink">
                    Type <span className="font-mono text-danger">DELETE</span> to confirm
                  </label>
                  <input
                    id="delete-account-text"
                    value={confirmation}
                    onChange={(event) => {
                      setConfirmation(event.target.value);
                      setError(null);
                    }}
                    autoComplete="off"
                    spellCheck={false}
                    autoFocus
                    disabled={isDeleting}
                    className="mt-2 min-h-10 w-full rounded-lg border border-danger/35 bg-surface px-3 font-mono text-sm font-semibold text-ink focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/20 disabled:cursor-wait disabled:opacity-60"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={cancelDelete} disabled={isDeleting}>Cancel</Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void deleteAccount()}
                      disabled={confirmation !== "DELETE" || isDeleting}
                      aria-busy={isDeleting}
                      className="border-danger bg-danger text-white hover:border-danger hover:bg-danger/90 dark:border-danger dark:bg-danger dark:text-[#16201A]"
                    >
                      <ExclamationTriangleIcon aria-hidden="true" className="h-4 w-4" />
                      {isDeleting ? "Deleting…" : "Delete forever"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-3 text-xs leading-5 text-danger">{error}</p> : null}
    </div>
  );
}
