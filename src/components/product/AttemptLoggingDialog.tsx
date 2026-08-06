"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Button, cn } from "@/components/ui";
import { difficultyLabel } from "./product-utils";
import type { AttemptOutcome, PreferredLanguage, ProductDifficulty } from "./types";

interface AttemptProblem {
  id: string;
  title: string;
  difficulty: ProductDifficulty;
  estimatedMinutes?: number;
}

interface AttemptLoggingDialogProps {
  problem: AttemptProblem;
  recommendationItemId?: string | null;
  endpoint?: string;
  defaultLanguage?: PreferredLanguage;
  triggerLabel?: string;
  triggerVariant?: "primary" | "secondary" | "highlight" | "ghost";
}

interface AttemptFormState {
  outcome: AttemptOutcome;
  durationMinutes: number;
  hintsUsed: number;
  confidence: number;
  language: PreferredLanguage;
  notes: string;
}

interface ErrorPayload {
  message?: string;
  error?: string | { message?: string };
}

const outcomes: Array<{ value: AttemptOutcome; label: string; description: string }> = [
  { value: "SOLVED", label: "Solved", description: "Reached a correct accepted solution" },
  { value: "PARTIAL", label: "Partial", description: "Made meaningful progress but did not finish" },
  { value: "FAILED", label: "Not solved", description: "Attempted seriously without a solution" },
  { value: "ABANDONED", label: "Stopped early", description: "Ended before a full attempt" },
];

const languages: Array<{ value: PreferredLanguage; label: string }> = [
  { value: "CPP", label: "C++" },
  { value: "JAVA", label: "Java" },
  { value: "PYTHON", label: "Python" },
  { value: "JAVASCRIPT", label: "JavaScript" },
  { value: "TYPESCRIPT", label: "TypeScript" },
  { value: "GO", label: "Go" },
  { value: "RUST", label: "Rust" },
];

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `attempt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function initialState(problem: AttemptProblem, defaultLanguage: PreferredLanguage): AttemptFormState {
  return {
    outcome: "SOLVED",
    durationMinutes: Math.max(1, problem.estimatedMinutes ?? 30),
    hintsUsed: 0,
    confidence: 3,
    language: defaultLanguage,
    notes: "",
  };
}

export function AttemptLoggingDialog({
  problem,
  recommendationItemId,
  endpoint = "/api/v1/attempts",
  defaultLanguage = "PYTHON",
  triggerLabel = "Log result",
  triggerVariant = "secondary",
}: AttemptLoggingDialogProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const idempotencyKeyRef = useRef(createIdempotencyKey());
  const dialogId = useId();
  const [form, setForm] = useState<AttemptFormState>(() => initialState(problem, defaultLanguage));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const resetForm = () => {
    setForm(initialState(problem, defaultLanguage));
    setError(null);
    setIsComplete(false);
    setIsSubmitting(false);
    idempotencyKeyRef.current = createIdempotencyKey();
  };

  const openDialog = () => {
    resetForm();
    dialogRef.current?.showModal();
    window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLInputElement>('input[name="outcome"]')?.focus();
    });
  };

  const closeDialog = () => {
    if (isSubmitting) return;
    dialogRef.current?.close();
  };

  const submitAttempt = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!Number.isFinite(form.durationMinutes) || form.durationMinutes < 1 || form.durationMinutes > 1440) {
      setError("Duration must be between 1 and 1,440 minutes.");
      return;
    }

    if (!Number.isInteger(form.hintsUsed) || form.hintsUsed < 0 || form.hintsUsed > 99) {
      setError("Hints used must be a whole number between 0 and 99.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKeyRef.current,
        },
        body: JSON.stringify({
          problemId: problem.id,
          recommendationItemId: recommendationItemId ?? undefined,
          idempotencyKey: idempotencyKeyRef.current,
          outcome: form.outcome,
          source: "IN_APP",
          durationMinutes: form.durationMinutes,
          hintsUsed: form.hintsUsed,
          confidence: form.confidence,
          language: form.language,
          notes: form.notes.trim() || undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

      if (!response.ok) {
        throw new Error(
          payload?.message ??
            (typeof payload?.error === "object" ? payload.error.message : payload?.error) ??
            "The attempt could not be saved. Please try again.",
        );
      }

      setIsComplete(true);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "The attempt could not be saved. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button type="button" variant={triggerVariant} onClick={openDialog}>
        {triggerLabel}
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`${dialogId}-title`}
        aria-describedby={`${dialogId}-description`}
        onCancel={(event) => {
          if (isSubmitting) event.preventDefault();
        }}
        onClose={() => {
          if (!isSubmitting) resetForm();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(680px,calc(100%-1.5rem))] overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-ink shadow-lift backdrop:bg-[#0D120F]/60 backdrop:backdrop-blur-sm open:animate-fade-up"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-surface px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              {difficultyLabel[problem.difficulty]} · Practice result
            </p>
            <h2 id={`${dialogId}-title`} className="mt-1 truncate text-xl font-bold tracking-[-0.03em] text-ink">
              Log {problem.title}
            </h2>
            <p id={`${dialogId}-description`} className="mt-1 text-xs leading-5 text-muted">
              Honest outcomes improve mastery estimates and future recommendations.
            </p>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            disabled={isSubmitting}
            aria-label="Close attempt logger"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink disabled:opacity-50"
          >
            <XMarkIcon aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        {isComplete ? (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center" aria-live="polite">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success">
              <CheckCircleIcon aria-hidden="true" className="h-8 w-8" />
            </span>
            <h3 className="mt-5 text-xl font-bold tracking-[-0.025em] text-ink">Attempt logged</h3>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
              Your mastery and review timing will reflect this result in the next recommendation run.
            </p>
            <Button type="button" className="mt-6" onClick={closeDialog}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={submitAttempt} className="p-5 sm:p-6">
            <fieldset>
              <legend className="text-sm font-bold text-ink">How did it go?</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {outcomes.map((outcome) => (
                  <label
                    key={outcome.value}
                    className={cn(
                      "cursor-pointer rounded-xl border p-3.5 transition-colors",
                      form.outcome === outcome.value
                        ? "border-ink bg-subtle dark:border-highlight"
                        : "border-line bg-surface hover:border-ink/30 hover:bg-subtle/50",
                    )}
                  >
                    <input
                      type="radio"
                      name="outcome"
                      value={outcome.value}
                      checked={form.outcome === outcome.value}
                      onChange={() => setForm((current) => ({ ...current, outcome: outcome.value }))}
                      className="sr-only"
                    />
                    <span className="flex items-center gap-2 text-sm font-bold text-ink">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "h-3 w-3 rounded-full border",
                          form.outcome === outcome.value ? "border-ink bg-highlight dark:border-highlight" : "border-muted bg-transparent",
                        )}
                      />
                      {outcome.label}
                    </span>
                    <span className="mt-1 block pl-5 text-xs leading-5 text-muted">{outcome.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="flex items-center gap-2 text-sm font-bold text-ink">
                  <ClockIcon aria-hidden="true" className="h-4 w-4 text-muted" />
                  Time spent
                </span>
                <div className="relative mt-2">
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    required
                    value={form.durationMinutes}
                    onChange={(event) => setForm((current) => ({ ...current, durationMinutes: Number(event.target.value) }))}
                    className="min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 pr-16 text-sm font-semibold text-ink focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-muted">minutes</span>
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-bold text-ink">Hints used</span>
                <input
                  type="number"
                  min={0}
                  max={99}
                  required
                  value={form.hintsUsed}
                  onChange={(event) => setForm((current) => ({ ...current, hintsUsed: Number(event.target.value) }))}
                  className="mt-2 min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 text-sm font-semibold text-ink focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
                />
              </label>
            </div>

            <fieldset className="mt-6">
              <legend className="text-sm font-bold text-ink">Confidence after this attempt</legend>
              <p className="mt-1 text-xs text-muted">1 means “need to relearn”; 5 means “could explain it clearly.”</p>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((confidence) => (
                  <label key={confidence} className="cursor-pointer">
                    <input
                      type="radio"
                      name="confidence"
                      value={confidence}
                      checked={form.confidence === confidence}
                      onChange={() => setForm((current) => ({ ...current, confidence }))}
                      className="peer sr-only"
                    />
                    <span className="flex min-h-11 items-center justify-center rounded-[10px] border border-line bg-surface font-mono text-sm font-bold text-muted transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-canvas peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-action dark:peer-checked:border-highlight dark:peer-checked:bg-highlight dark:peer-checked:text-[#16201A]">
                      {confidence}
                    </span>
                    <span className="sr-only">Confidence {confidence} out of 5</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mt-6 block">
              <span className="text-sm font-bold text-ink">Language used</span>
              <select
                value={form.language}
                onChange={(event) => setForm((current) => ({ ...current, language: event.target.value as PreferredLanguage }))}
                className="mt-2 min-h-11 w-full rounded-[10px] border border-line bg-surface px-3 text-sm font-semibold text-ink focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
              >
                {languages.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-6 block">
              <span className="flex items-baseline justify-between gap-3 text-sm font-bold text-ink">
                Notes <span className="text-xs font-normal text-muted">Optional · {form.notes.length}/500</span>
              </span>
              <textarea
                value={form.notes}
                maxLength={500}
                rows={3}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="What clicked, where you got stuck, or what to review…"
                className="mt-2 w-full resize-y rounded-[10px] border border-line bg-surface px-3 py-3 text-sm leading-6 text-ink placeholder:text-muted/70 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
              />
            </label>

            {error ? (
              <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3.5 text-sm leading-6 text-danger">
                <ExclamationCircleIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={closeDialog} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? "Saving attempt…" : "Save attempt"}
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
