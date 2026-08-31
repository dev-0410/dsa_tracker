"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CodeBracketIcon,
  FlagIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { BrandLogo } from "@/components/brand";
import { Badge, Button, Container, cn } from "@/components/ui";

type TopicOption = { id: string; slug: string; name: string; description: string | null };

type Props = {
  user: { name: string; email: string; image: string | null };
  topics: TopicOption[];
};

const steps = [
  { label: "Goal", icon: FlagIcon },
  { label: "Routine", icon: SparklesIcon },
  { label: "Baseline", icon: CodeBracketIcon },
] as const;

const coreTopicSlugs = new Set([
  "arrays",
  "strings",
  "hashing",
  "two-pointers",
  "sliding-window",
  "binary-search",
  "linked-list",
  "stack",
  "trees",
  "graphs",
  "backtracking",
  "dynamic-programming",
  "greedy",
  "intervals",
  "bit-manipulation",
]);

const fieldClass =
  "mt-2 min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm font-semibold text-ink placeholder:text-muted/60 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20";

function apiMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const error = (payload as { error?: unknown }).error;
  if (error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return null;
}

export function OnboardingForm({ user, topics }: Props) {
  const router = useRouter();
  const selectableTopics = useMemo(() => topics.filter((topic) => coreTopicSlugs.has(topic.slug)), [topics]);
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    displayName: user.name,
    handle: user.email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24) ?? "",
    currentRole: "",
    targetRole: "Software Engineer",
    experienceLevel: "BEGINNER",
    learningGoal: "INTERVIEW_PREP",
    weeklyTarget: 7,
    minutesPerDay: 45,
    preferredLanguage: "PYTHON",
    targetDate: "",
    topicIds: selectableTopics.slice(0, 4).map((topic) => topic.id),
    platform: "LEETCODE",
    platformHandle: "",
  });

  const setValue = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const toggleTopic = (id: string) => {
    setForm((current) => ({
      ...current,
      topicIds: current.topicIds.includes(id)
        ? current.topicIds.filter((topicId) => topicId !== id)
        : current.topicIds.length < 8
          ? [...current.topicIds, id]
          : current.topicIds,
    }));
  };

  const nextStep = () => {
    if (step === 0 && (!form.displayName.trim() || form.handle.length < 3 || !form.targetRole.trim())) {
      setError("Add a display name, a valid handle, and your target role to continue.");
      return;
    }
    if (step === 1 && (form.weeklyTarget < 1 || form.minutesPerDay < 5)) {
      setError("Choose a realistic weekly target and at least five minutes per session.");
      return;
    }
    setError(null);
    setStep((current) => Math.min(2, current + 1));
  };

  const submit = async () => {
    if (form.topicIds.length < 3) {
      setError("Choose at least three topics so the first queue has enough signal.");
      return;
    }
    if (!form.platformHandle.trim()) {
      setError("Connect one public coding profile to complete your baseline.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const response = await fetch("/api/v1/me", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          handle: form.handle.trim().toLowerCase(),
          displayName: form.displayName.trim(),
          bio: null,
          timezone,
          currentRole: form.currentRole.trim() || null,
          targetRole: form.targetRole.trim(),
          experienceLevel: form.experienceLevel,
          learningGoal: form.learningGoal,
          weeklyTarget: form.weeklyTarget,
          minutesPerDay: form.minutesPerDay,
          preferredLanguage: form.preferredLanguage,
          targetDate: form.targetDate ? new Date(`${form.targetDate}T00:00:00.000Z`).toISOString() : null,
          isPublic: false,
          topicIds: form.topicIds,
          platformIdentities: [{ platform: form.platform, handle: form.platformHandle.trim() }],
        }),
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) throw new Error(apiMessage(payload) ?? "Your profile could not be completed.");
      router.push("/app");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your profile could not be completed.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line bg-surface">
        <Container className="flex h-[72px] items-center justify-between">
          <BrandLogo />
          <div className="hidden items-center gap-2 text-xs font-semibold text-muted sm:flex">
            <ShieldCheckIcon className="h-4 w-4 text-success" aria-hidden="true" />
            Private by default
          </div>
        </Container>
      </header>

      <main className="relative overflow-hidden py-8 sm:py-12">
        <div aria-hidden="true" className="workbench-grid pointer-events-none absolute inset-x-0 top-0 h-[420px]" />
        <Container className="relative max-w-5xl">
          <div className="mb-8 max-w-2xl">
            <p className="eyebrow">Profile setup · about 2 minutes</p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.045em] sm:text-4xl">Build a queue around the person you are becoming.</h1>
            <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
              Your answers initialize mastery estimates. Actual attempts replace those estimates as you practice.
            </p>
          </div>

          <ol aria-label="Onboarding progress" className="mb-6 grid grid-cols-3 gap-2">
            {steps.map((item, index) => (
              <li key={item.label} className={cn("rounded-xl border p-3", index === step ? "border-ink bg-surface dark:border-highlight" : index < step ? "border-success/30 bg-success/5" : "border-line bg-surface/65")}>
                <div className="flex items-center gap-2">
                  <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", index < step ? "bg-success text-white" : index === step ? "bg-ink text-highlight dark:bg-highlight dark:text-[#16201A]" : "bg-subtle text-muted")}>
                    {index < step ? <CheckIcon className="h-4 w-4" /> : <item.icon className="h-4 w-4" />}
                  </span>
                  <span className="text-xs font-bold sm:text-sm">{item.label}</span>
                </div>
              </li>
            ))}
          </ol>

          <section className="surface-card p-5 sm:p-8" aria-live="polite">
            {step === 0 ? (
              <div>
                <p className="eyebrow">01 · Direction</p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em]">What are you optimizing for?</h2>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <label className="text-sm font-bold">Display name<input className={fieldClass} value={form.displayName} onChange={(event) => setValue("displayName", event.target.value)} autoComplete="name" /></label>
                  <label className="text-sm font-bold">Invariant handle<input className={fieldClass} value={form.handle} onChange={(event) => setValue("handle", event.target.value.toLowerCase())} pattern="[a-z0-9_-]{3,30}" autoComplete="username" /><span className="mt-1.5 block text-xs font-normal text-muted">Lowercase letters, numbers, _ or -</span></label>
                  <label className="text-sm font-bold">Current role <span className="font-normal text-muted">(optional)</span><input className={fieldClass} value={form.currentRole} onChange={(event) => setValue("currentRole", event.target.value)} placeholder="Student, frontend engineer…" /></label>
                  <label className="text-sm font-bold">Target role<input className={fieldClass} value={form.targetRole} onChange={(event) => setValue("targetRole", event.target.value)} /></label>
                  <label className="text-sm font-bold">Experience level<select className={fieldClass} value={form.experienceLevel} onChange={(event) => setValue("experienceLevel", event.target.value)}><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option></select></label>
                  <label className="text-sm font-bold">Primary goal<select className={fieldClass} value={form.learningGoal} onChange={(event) => setValue("learningGoal", event.target.value)}><option value="INTERVIEW_PREP">Interview preparation</option><option value="COMPETITIVE_PROGRAMMING">Competitive programming</option><option value="CORE_FUNDAMENTALS">Core fundamentals</option><option value="CAREER_SWITCH">Career switch</option></select></label>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div>
                <p className="eyebrow">02 · Constraints</p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em]">Design a routine you can actually keep.</h2>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <label className="text-sm font-bold">Problems per week<input type="number" min={1} max={100} className={fieldClass} value={form.weeklyTarget} onChange={(event) => setValue("weeklyTarget", Number(event.target.value))} /></label>
                  <label className="text-sm font-bold">Minutes per practice day<input type="number" min={5} max={720} className={fieldClass} value={form.minutesPerDay} onChange={(event) => setValue("minutesPerDay", Number(event.target.value))} /></label>
                  <label className="text-sm font-bold">Preferred language<select className={fieldClass} value={form.preferredLanguage} onChange={(event) => setValue("preferredLanguage", event.target.value)}><option value="PYTHON">Python</option><option value="CPP">C++</option><option value="JAVA">Java</option><option value="JAVASCRIPT">JavaScript</option><option value="TYPESCRIPT">TypeScript</option><option value="GO">Go</option><option value="RUST">Rust</option></select></label>
                  <label className="text-sm font-bold">Target date <span className="font-normal text-muted">(optional)</span><input type="date" className={fieldClass} value={form.targetDate} onChange={(event) => setValue("targetDate", event.target.value)} /></label>
                </div>
                <div className="mt-6 rounded-xl border border-line bg-subtle/65 p-4 text-sm leading-6 text-muted">
                  Invariant treats your time budget as a ranking constraint, so a 25-minute session will not quietly become a two-hour plan.
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <p className="eyebrow">03 · Starting signal</p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em]">Choose focus areas and connect one profile.</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Pick 3–8 topics. The order of your queue adapts after every result.</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {selectableTopics.map((topic) => {
                    const selected = form.topicIds.includes(topic.id);
                    return (
                      <button key={topic.id} type="button" aria-pressed={selected} onClick={() => toggleTopic(topic.id)} className={cn("min-h-16 rounded-xl border p-3 text-left transition-colors", selected ? "border-ink bg-highlight text-[#16201A]" : "border-line bg-surface hover:bg-subtle")}>
                        <span className="flex items-center justify-between gap-2 text-sm font-bold">{topic.name}{selected ? <CheckIcon className="h-4 w-4" /> : null}</span>
                        <span className={cn("mt-1 block text-xs leading-5", selected ? "text-[#43501f]" : "text-muted")}>{topic.description}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-7 grid gap-4 rounded-xl border border-line bg-subtle/55 p-4 sm:grid-cols-[180px_1fr]">
                  <label className="text-sm font-bold">Platform<select className={fieldClass} value={form.platform} onChange={(event) => setValue("platform", event.target.value)}><option value="LEETCODE">LeetCode</option><option value="CODEFORCES">Codeforces</option></select></label>
                  <label className="text-sm font-bold">Public username<input className={fieldClass} value={form.platformHandle} onChange={(event) => setValue("platformHandle", event.target.value)} placeholder={form.platform === "LEETCODE" ? "your-leetcode-handle" : "your_codeforces_handle"} /><span className="mt-1.5 block text-xs font-normal text-muted">We import public solved counts and accepted problem IDs, never platform credentials.</span></label>
                </div>
              </div>
            ) : null}

            {error ? <div role="alert" className="mt-6 rounded-xl border border-danger/30 bg-danger/5 p-3.5 text-sm text-danger">{error}</div> : null}

            <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
              <Button variant="ghost" disabled={step === 0 || pending} onClick={() => { setStep((current) => Math.max(0, current - 1)); setError(null); }}><ArrowLeftIcon className="h-4 w-4" />Back</Button>
              {step < 2 ? <Button onClick={nextStep}>Continue<ArrowRightIcon className="h-4 w-4" /></Button> : <Button onClick={submit} disabled={pending} aria-busy={pending}>{pending ? "Importing profile…" : "Import profile and continue"}<ArrowRightIcon className="h-4 w-4" /></Button>}
            </div>
          </section>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
            <span>Signed in as {user.email}</span>
            <Badge variant="success">Google account verified</Badge>
          </div>
        </Container>
      </main>
    </div>
  );
}
