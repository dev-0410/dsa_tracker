"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Button, cn } from "@/components/ui";

export interface FocusTopicOption {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

interface FocusTopicsFormProps {
  topics: FocusTopicOption[];
  initialSelectedIds: string[];
}

const MIN_TOPICS = 3;
const MAX_TOPICS = 12;

function selectionKey(ids: string[]): string {
  return [...ids].sort().join("\u0000");
}

function apiMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const error = (payload as { error?: unknown }).error;
  if (!error || typeof error !== "object") return null;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message : null;
}

export function FocusTopicsForm({ topics, initialSelectedIds }: FocusTopicsFormProps) {
  const router = useRouter();
  const validTopicIds = useMemo(() => new Set(topics.map((topic) => topic.id)), [topics]);
  const safeInitialIds = useMemo(
    () => initialSelectedIds.filter((id, index, ids) => validTopicIds.has(id) && ids.indexOf(id) === index).slice(0, MAX_TOPICS),
    [initialSelectedIds, validTopicIds],
  );
  const [selectedIds, setSelectedIds] = useState(safeInitialIds);
  const [savedIds, setSavedIds] = useState(safeInitialIds);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const isDirty = selectionKey(selectedIds) !== selectionKey(savedIds);
  const isValid = selectedIds.length >= MIN_TOPICS && selectedIds.length <= MAX_TOPICS;
  const filteredTopics = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("en-US");
    if (!query) return topics;
    return topics.filter((topic) =>
      `${topic.name} ${topic.description ?? ""}`.toLocaleLowerCase("en-US").includes(query),
    );
  }, [search, topics]);

  const toggleTopic = (topic: FocusTopicOption) => {
    setError(null);
    if (selected.has(topic.id)) {
      if (selectedIds.length <= MIN_TOPICS) {
        toast.info(`Keep at least ${MIN_TOPICS} focus topics selected.`);
        return;
      }
      setSelectedIds((current) => current.filter((id) => id !== topic.id));
      return;
    }
    if (selectedIds.length >= MAX_TOPICS) {
      toast.info(`You can select up to ${MAX_TOPICS} focus topics.`);
      return;
    }
    setSelectedIds((current) => [...current, topic.id]);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) {
      setError(`Choose between ${MIN_TOPICS} and ${MAX_TOPICS} focus topics.`);
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/me/topics", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topicIds: selectedIds }),
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) throw new Error(apiMessage(payload) ?? "Your focus topics could not be saved.");
      setSavedIds(selectedIds);
      toast.success("Focus topics updated. Your next queue will use the new priorities.");
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Your focus topics could not be saved.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <form id="topics" onSubmit={submit} className="scroll-mt-8 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6" aria-labelledby="focus-topics-title">
      <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Recommendation scope</p>
          <h2 id="focus-topics-title" className="mt-1 text-xl font-bold tracking-[-0.03em] text-ink">Focus topics</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Select 3–12 areas. These preferences steer exploration while observed mastery still controls difficulty and review timing.</p>
        </div>
        <span className={cn("shrink-0 rounded-full border px-3 py-1.5 font-mono text-xs font-bold", isValid ? "border-line bg-subtle text-muted" : "border-danger/30 bg-danger/5 text-danger")} aria-live="polite">
          {selectedIds.length} / {MAX_TOPICS} selected
        </span>
      </div>

      <label className="relative mt-5 block">
        <span className="sr-only">Search catalog topics</span>
        <MagnifyingGlassIcon aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search arrays, graphs, dynamic programming…"
          className="min-h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3.5 text-sm font-semibold text-ink placeholder:text-muted/60 focus:border-action focus:outline-none focus:ring-2 focus:ring-action/20"
        />
      </label>

      {filteredTopics.length ? (
        <div className="mt-4 grid max-h-[580px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTopics.map((topic) => {
            const isSelected = selected.has(topic.id);
            return (
              <button
                key={topic.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleTopic(topic)}
                disabled={pending}
                className={cn(
                  "min-h-20 rounded-xl border p-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:cursor-wait disabled:opacity-60",
                  isSelected
                    ? "border-ink bg-highlight text-[#16201A] dark:border-highlight"
                    : "border-line bg-surface text-ink hover:bg-subtle",
                )}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-bold">
                  {topic.name}
                  {isSelected ? <CheckIcon aria-hidden="true" className="h-4 w-4 shrink-0" /> : null}
                </span>
                <span className={cn("mt-1 block text-xs leading-5", isSelected ? "text-[#43501F]" : "text-muted")}>
                  {topic.description ?? "A catalog topic used for mastery and recommendation calibration."}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-line bg-subtle/45 px-5 py-8 text-center">
          <Squares2X2Icon aria-hidden="true" className="mx-auto h-7 w-7 text-muted" />
          <p className="mt-3 text-sm font-bold text-ink">No topics match “{search.trim()}”</p>
          <button type="button" onClick={() => setSearch("")} className="mt-2 text-xs font-bold text-action hover:underline">Clear search</button>
        </div>
      )}

      {error ? <p role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-3 text-xs leading-5 text-danger">{error}</p> : null}

      <div className="mt-5 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold text-muted" aria-live="polite">{isDirty ? "Your focus-topic selection has unsaved changes." : "Focus topics are up to date."}</p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => { setSelectedIds(savedIds); setError(null); }} disabled={!isDirty || pending} className="flex-1 sm:flex-none">Discard</Button>
          <Button type="submit" disabled={!isDirty || !isValid || pending} aria-busy={pending} className="flex-1 sm:flex-none">{pending ? "Saving…" : "Save focus topics"}</Button>
        </div>
      </div>
    </form>
  );
}
