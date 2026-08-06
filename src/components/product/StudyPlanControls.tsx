"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ForwardIcon,
  PlayIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Button, buttonStyles, cn } from "@/components/ui";
import type { PreferredLanguage } from "@/components/product/types";
import type { StudyPlanItemStatus, StudyPlanItemView } from "@/lib/plans/types";
import { AttemptLoggingDialog } from "./AttemptLoggingDialog";

type ErrorEnvelope = { error?: { message?: string } };

async function errorMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as ErrorEnvelope | null;
  return payload?.error?.message ?? fallback;
}

export function CreateStudyPlanDialog({
  defaultStartDate,
  hasActivePlan,
}: {
  defaultStartDate: string;
  hasActivePlan: boolean;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [durationDays, setDurationDays] = useState(14);
  const [problemsPerDay, setProblemsPerDay] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (!pending) dialogRef.current?.close();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/v1/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          startDate,
          durationDays,
          problemsPerDay,
        }),
      });
      if (!response.ok) {
        throw new Error(await errorMessage(response, "The plan could not be built."));
      }
      toast.success(hasActivePlan ? "New plan ready; the previous plan was archived" : "Your adaptive plan is ready");
      dialogRef.current?.close();
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The plan could not be built.");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Button variant={hasActivePlan ? "secondary" : "primary"} onClick={() => dialogRef.current?.showModal()}>
        {hasActivePlan ? <ArrowPathIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
        {hasActivePlan ? "Build a new plan" : "Build my plan"}
      </Button>

      <dialog
        ref={dialogRef}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        className="m-auto w-[min(620px,calc(100%-1.5rem))] overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink shadow-lift backdrop:bg-[#0D120F]/60 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-6">
          <div>
            <p className="eyebrow">Adaptive schedule</p>
            <h2 className="mt-1 text-xl font-bold tracking-[-0.03em]">Build a plan around your evidence</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              The ranker chooses the problems; the scheduler balances reviews, time, topics, and difficulty.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={pending}
            aria-label="Close plan builder"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink disabled:opacity-50"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 sm:p-6">
          <label className="block">
            <span className="text-sm font-bold">Plan name <span className="font-normal text-muted">(optional)</span></span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              minLength={3}
              maxLength={80}
              placeholder={`${durationDays}-day adaptive plan`}
              className="mt-2 min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 text-sm font-semibold focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
            />
          </label>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold">Start date</span>
              <input
                type="date"
                required
                min={defaultStartDate}
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 text-sm font-semibold focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold">Duration</span>
              <select
                value={durationDays}
                onChange={(event) => {
                  const duration = Number(event.target.value);
                  setDurationDays(duration);
                  if (duration * problemsPerDay > 28) setProblemsPerDay(1);
                }}
                className="mt-2 min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 text-sm font-semibold focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
              >
                {[7, 14, 21, 28].map((days) => <option key={days} value={days}>{days} days</option>)}
              </select>
            </label>
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-bold">Daily load</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[1, 2].map((count) => {
                const disabled = count * durationDays > 28;
                return (
                  <label key={count} className={cn("rounded-xl border p-3.5", disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer", problemsPerDay === count && !disabled ? "border-ink bg-subtle dark:border-highlight" : "border-line")}>
                    <input type="radio" name="problemsPerDay" value={count} checked={problemsPerDay === count} disabled={disabled} onChange={() => setProblemsPerDay(count)} className="sr-only" />
                    <span className="block text-sm font-bold">{count} problem{count === 1 ? "" : "s"} / day</span>
                    <span className="mt-1 block text-xs text-muted">Up to {durationDays * count} ranked problems</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {hasActivePlan ? (
            <p className="mt-5 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs leading-5 text-warning">
              Building this plan archives your current plan. Its history and completed work remain available.
            </p>
          ) : null}
          {error ? <p role="alert" className="mt-5 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p> : null}

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={close} disabled={pending}>Cancel</Button>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PlayIcon className="h-4 w-4" />}
              {pending ? "Ranking and scheduling…" : `Build ${durationDays * problemsPerDay}-problem plan`}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function StudyPlanItemActions({
  planId,
  item,
  defaultLanguage,
}: {
  planId: string;
  item: StudyPlanItemView;
  defaultLanguage: PreferredLanguage;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<StudyPlanItemStatus | null>(null);

  const update = async (status: StudyPlanItemStatus) => {
    setPending(status);
    try {
      const response = await fetch(`/api/v1/plans/${encodeURIComponent(planId)}/items/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error(await errorMessage(response, "The plan item could not be updated."));
      toast.success(
        status === "SKIPPED"
          ? "Problem skipped; your mastery was not changed"
          : status === "TODO"
            ? "Problem returned to the schedule"
            : "Problem marked in progress",
      );
      router.refresh();
    } catch (caughtError) {
      toast.error(caughtError instanceof Error ? caughtError.message : "The plan item could not be updated.");
    } finally {
      setPending(null);
    }
  };

  if (item.status === "COMPLETED") {
    return (
      <span className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-success/10 px-3 text-xs font-bold text-success">
        <CheckCircleIcon className="h-4 w-4" /> Verified solve
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={item.problem.url} target="_blank" rel="noopener noreferrer" className={buttonStyles({ variant: "primary", size: "sm" })}>
        Open problem <ArrowTopRightOnSquareIcon className="h-4 w-4" />
      </a>
      {item.status !== "SKIPPED" ? (
        <AttemptLoggingDialog
          problem={{
            id: item.problem.id,
            title: item.problem.title,
            difficulty: item.problem.difficulty,
            estimatedMinutes: item.problem.estimatedMinutes,
          }}
          defaultLanguage={defaultLanguage}
          triggerLabel="Log result"
          triggerVariant="secondary"
        />
      ) : null}
      {item.status === "TODO" ? (
        <Button size="sm" variant="ghost" disabled={pending !== null} onClick={() => void update("IN_PROGRESS")}>
          <PlayIcon className="h-4 w-4" />{pending === "IN_PROGRESS" ? "Starting…" : "Start"}
        </Button>
      ) : null}
      {item.status === "IN_PROGRESS" ? (
        <Button size="sm" variant="ghost" disabled={pending !== null} onClick={() => void update("TODO")}>
          <ArrowPathIcon className="h-4 w-4" />{pending === "TODO" ? "Resetting…" : "Reset"}
        </Button>
      ) : null}
      {item.status === "SKIPPED" ? (
        <Button size="sm" variant="secondary" disabled={pending !== null} onClick={() => void update("TODO")}>
          <ArrowPathIcon className="h-4 w-4" />{pending === "TODO" ? "Restoring…" : "Restore"}
        </Button>
      ) : (
        <Button size="sm" variant="ghost" disabled={pending !== null} onClick={() => void update("SKIPPED")}>
          <ForwardIcon className="h-4 w-4" />{pending === "SKIPPED" ? "Skipping…" : "Skip"}
        </Button>
      )}
    </div>
  );
}
