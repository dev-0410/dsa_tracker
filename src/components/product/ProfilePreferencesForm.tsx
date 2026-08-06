"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MapPinIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import type { PreferredLanguage } from "./types";

type ExperienceLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
type LearningGoal = "INTERVIEW_PREP" | "COMPETITIVE_PROGRAMMING" | "CORE_FUNDAMENTALS" | "CAREER_SWITCH";

export interface ProfilePreferencesValue {
  handle: string;
  displayName: string;
  bio: string;
  timezone: string;
  currentRole: string;
  targetRole: string;
  experienceLevel: ExperienceLevel;
  learningGoal: LearningGoal;
  weeklyTarget: number;
  minutesPerDay: number;
  preferredLanguage: PreferredLanguage;
  targetDate: string;
  isPublic: boolean;
}

interface ProfilePreferencesFormProps {
  initialValue: ProfilePreferencesValue;
}

const fieldClass =
  "mt-2 min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm font-semibold text-ink placeholder:text-muted/60 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20 disabled:cursor-not-allowed disabled:opacity-60";

function apiMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const error = (payload as { error?: unknown }).error;
  if (!error || typeof error !== "object") return null;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message : null;
}

export function ProfilePreferencesForm({ initialValue }: ProfilePreferencesFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(savedValue), [form, savedValue]);

  const setValue = <K extends keyof ProfilePreferencesValue>(key: K, value: ProfilePreferencesValue[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const detectTimezone = () => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected) setValue("timezone", detected);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const normalized: ProfilePreferencesValue = {
        ...form,
        handle: form.handle.trim().toLowerCase(),
        displayName: form.displayName.trim(),
        bio: form.bio.trim(),
        timezone: form.timezone.trim(),
        currentRole: form.currentRole.trim(),
        targetRole: form.targetRole.trim(),
      };
      const response = await fetch("/api/v1/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...normalized,
          bio: normalized.bio || null,
          currentRole: normalized.currentRole || null,
          targetDate: normalized.targetDate ? new Date(`${normalized.targetDate}T00:00:00.000Z`).toISOString() : null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) throw new Error(apiMessage(payload) ?? "Your settings could not be saved.");

      setForm(normalized);
      setSavedValue(normalized);
      toast.success("Profile and practice preferences saved.");
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Your settings could not be saved.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <section id="profile" className="scroll-mt-8 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6" aria-labelledby="profile-settings-title">
        <div className="border-b border-line pb-5">
          <p className="eyebrow">Identity</p>
          <h2 id="profile-settings-title" className="mt-1 text-xl font-bold tracking-[-0.03em] text-ink">
            Profile
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">The context shown in your workspace and used to shape the practice plan.</p>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-bold text-ink">
            Display name
            <input
              value={form.displayName}
              onChange={(event) => setValue("displayName", event.target.value)}
              className={fieldClass}
              minLength={2}
              maxLength={60}
              autoComplete="name"
              required
            />
          </label>
          <label className="text-sm font-bold text-ink">
            Invariant handle
            <div className="relative mt-2">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-muted">@</span>
              <input
                value={form.handle}
                onChange={(event) => setValue("handle", event.target.value.toLowerCase())}
                className={`${fieldClass} mt-0 pl-7`}
                minLength={3}
                maxLength={30}
                pattern="[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?"
                autoComplete="username"
                required
              />
            </div>
          </label>
          <label className="text-sm font-bold text-ink sm:col-span-2">
            Bio <span className="font-normal text-muted">(optional)</span>
            <textarea
              value={form.bio}
              onChange={(event) => setValue("bio", event.target.value)}
              className={`${fieldClass} min-h-24 py-3 leading-6`}
              maxLength={240}
              rows={3}
              placeholder="What are you working toward?"
            />
            <span className="mt-1.5 block text-right text-xs font-normal text-muted">{form.bio.length}/240</span>
          </label>
          <label className="text-sm font-bold text-ink">
            Current role <span className="font-normal text-muted">(optional)</span>
            <input
              value={form.currentRole}
              onChange={(event) => setValue("currentRole", event.target.value)}
              className={fieldClass}
              maxLength={80}
              placeholder="Student, backend engineer…"
            />
          </label>
          <label className="text-sm font-bold text-ink">
            Target role
            <input
              value={form.targetRole}
              onChange={(event) => setValue("targetRole", event.target.value)}
              className={fieldClass}
              minLength={2}
              maxLength={80}
              required
            />
          </label>
          <label className="text-sm font-bold text-ink">
            Experience level
            <select
              value={form.experienceLevel}
              onChange={(event) => setValue("experienceLevel", event.target.value as ExperienceLevel)}
              className={fieldClass}
            >
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </label>
          <label className="text-sm font-bold text-ink">
            Primary goal
            <select
              value={form.learningGoal}
              onChange={(event) => setValue("learningGoal", event.target.value as LearningGoal)}
              className={fieldClass}
            >
              <option value="INTERVIEW_PREP">Interview preparation</option>
              <option value="COMPETITIVE_PROGRAMMING">Competitive programming</option>
              <option value="CORE_FUNDAMENTALS">Core fundamentals</option>
              <option value="CAREER_SWITCH">Career switch</option>
            </select>
          </label>
        </div>
      </section>

      <section id="preferences" className="scroll-mt-8 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6" aria-labelledby="practice-preferences-title">
        <div className="border-b border-line pb-5">
          <p className="eyebrow">Recommendation constraints</p>
          <h2 id="practice-preferences-title" className="mt-1 text-xl font-bold tracking-[-0.03em] text-ink">
            Practice preferences
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">These values directly affect queue size, time fit, and difficulty calibration.</p>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-bold text-ink">
            Problems per week
            <input
              type="number"
              min={1}
              max={100}
              value={form.weeklyTarget}
              onChange={(event) => setValue("weeklyTarget", Number(event.target.value))}
              className={fieldClass}
              required
            />
          </label>
          <label className="text-sm font-bold text-ink">
            Minutes per practice day
            <input
              type="number"
              min={5}
              max={720}
              value={form.minutesPerDay}
              onChange={(event) => setValue("minutesPerDay", Number(event.target.value))}
              className={fieldClass}
              required
            />
          </label>
          <label className="text-sm font-bold text-ink">
            Preferred language
            <select
              value={form.preferredLanguage}
              onChange={(event) => setValue("preferredLanguage", event.target.value as PreferredLanguage)}
              className={fieldClass}
            >
              <option value="PYTHON">Python</option>
              <option value="CPP">C++</option>
              <option value="JAVA">Java</option>
              <option value="JAVASCRIPT">JavaScript</option>
              <option value="TYPESCRIPT">TypeScript</option>
              <option value="GO">Go</option>
              <option value="RUST">Rust</option>
            </select>
          </label>
          <label className="text-sm font-bold text-ink">
            Target date <span className="font-normal text-muted">(optional)</span>
            <input
              type="date"
              value={form.targetDate}
              onChange={(event) => setValue("targetDate", event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="text-sm font-bold text-ink sm:col-span-2">
            Timezone
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                value={form.timezone}
                onChange={(event) => setValue("timezone", event.target.value)}
                className={`${fieldClass} mt-0 flex-1`}
                placeholder="Asia/Kolkata"
                required
              />
              <Button type="button" variant="secondary" onClick={detectTimezone} className="sm:self-stretch">
                <MapPinIcon aria-hidden="true" className="h-4 w-4" />
                Use device timezone
              </Button>
            </div>
          </label>
        </div>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-subtle/55 p-4">
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(event) => setValue("isPublic", event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-line accent-[#16201A] dark:accent-[#C7F269]"
          />
          <span>
            <span className="block text-sm font-bold text-ink">Allow a public profile</span>
            <span className="mt-1 block text-xs leading-5 text-muted">Only information explicitly shown on your profile is eligible for sharing. Practice notes remain private.</span>
          </span>
        </label>
      </section>

      {error ? (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm leading-6 text-danger">
          {error}
        </div>
      ) : null}

      <div className="sticky bottom-[calc(72px+env(safe-area-inset-bottom))] z-20 flex flex-col gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-lift backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
        <p className="px-1 text-xs font-semibold text-muted" aria-live="polite">
          {isDirty ? "You have unsaved changes." : "Everything is up to date."}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => setForm(savedValue)} disabled={!isDirty || pending} className="flex-1 sm:flex-none">
            Discard
          </Button>
          <Button type="submit" disabled={!isDirty || pending} aria-busy={pending} className="flex-1 sm:flex-none">
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
