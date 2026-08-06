import "server-only";

import { createEmptyCard, fsrs, Rating, type Card, type CardInput } from "ts-fsrs";
import type { ReviewRating } from "@/lib/recommendation";

const scheduler = fsrs({
  request_retention: 0.9,
  enable_fuzz: false,
  enable_short_term: false,
});

type StoredCard = Omit<Card, "due" | "last_review"> & {
  due: string;
  last_review?: string;
};

function hydrateCard(value: unknown, now: Date): CardInput | Card {
  if (!value || typeof value !== "object") return createEmptyCard(now);
  const candidate = value as Partial<StoredCard>;
  const due = candidate.due ? new Date(candidate.due) : null;
  if (
    !due ||
    Number.isNaN(due.getTime()) ||
    typeof candidate.stability !== "number" ||
    typeof candidate.difficulty !== "number" ||
    typeof candidate.reps !== "number" ||
    typeof candidate.lapses !== "number" ||
    candidate.state === undefined
  ) {
    return createEmptyCard(now);
  }

  return {
    due,
    stability: candidate.stability,
    difficulty: candidate.difficulty,
    elapsed_days: candidate.elapsed_days ?? 0,
    scheduled_days: candidate.scheduled_days ?? 0,
    learning_steps: candidate.learning_steps ?? 0,
    reps: candidate.reps,
    lapses: candidate.lapses,
    state: candidate.state,
    last_review: candidate.last_review ? new Date(candidate.last_review) : undefined,
  };
}

function toGrade(rating: ReviewRating) {
  if (rating === "AGAIN") return Rating.Again;
  if (rating === "HARD") return Rating.Hard;
  if (rating === "EASY") return Rating.Easy;
  return Rating.Good;
}

export function scheduleNextReview(storedCard: unknown, rating: ReviewRating, now = new Date()) {
  const result = scheduler.next(hydrateCard(storedCard, now), now, toGrade(rating));
  const serialized: StoredCard = {
    due: result.card.due.toISOString(),
    stability: result.card.stability,
    difficulty: result.card.difficulty,
    elapsed_days: result.card.elapsed_days,
    scheduled_days: result.card.scheduled_days,
    learning_steps: result.card.learning_steps,
    reps: result.card.reps,
    lapses: result.card.lapses,
    state: result.card.state,
    ...(result.card.last_review ? { last_review: result.card.last_review.toISOString() } : {}),
  };

  return {
    card: serialized,
    dueAt: result.card.due,
    scheduledDays: result.card.scheduled_days,
    rating,
  };
}
