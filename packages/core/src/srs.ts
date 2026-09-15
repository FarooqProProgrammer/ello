import { Rating, State, createEmptyCard, fsrs, generatorParameters, type Card, type Grade } from "ts-fsrs";

export const SRS_STATES = ["NEW", "LEARNING", "REVIEW", "RELEARNING"] as const;
export type SrsState = (typeof SRS_STATES)[number];

export const REVIEW_RATINGS = ["AGAIN", "HARD", "GOOD", "EASY"] as const;
export type ReviewRating = (typeof REVIEW_RATINGS)[number];

/** Persistence-friendly FSRS state (mirrors the VocabItem columns). */
export interface SrsCardState {
  due: Date;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: SrsState;
  lastReview: Date | null;
}

const STATE_TO_FSRS: Record<SrsState, State> = {
  NEW: State.New,
  LEARNING: State.Learning,
  REVIEW: State.Review,
  RELEARNING: State.Relearning,
};

const FSRS_TO_STATE: Record<State, SrsState> = {
  [State.New]: "NEW",
  [State.Learning]: "LEARNING",
  [State.Review]: "REVIEW",
  [State.Relearning]: "RELEARNING",
};

const RATING_TO_FSRS: Record<ReviewRating, Grade> = {
  AGAIN: Rating.Again,
  HARD: Rating.Hard,
  GOOD: Rating.Good,
  EASY: Rating.Easy,
};

const scheduler = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: true }));

export function newCardState(now: Date = new Date()): SrsCardState {
  return fromFsrs(createEmptyCard(now));
}

export function reviewCard(card: SrsCardState, rating: ReviewRating, now: Date = new Date()): SrsCardState {
  const result = scheduler.next(toFsrs(card, now), now, RATING_TO_FSRS[rating]);
  return fromFsrs(result.card);
}

/** Preview of the next interval per rating, for button labels like "Good · 3d". */
export function previewIntervals(card: SrsCardState, now: Date = new Date()): Record<ReviewRating, Date> {
  const out = {} as Record<ReviewRating, Date>;
  for (const rating of REVIEW_RATINGS) {
    out[rating] = scheduler.next(toFsrs(card, now), now, RATING_TO_FSRS[rating]).card.due;
  }
  return out;
}

export function formatInterval(from: Date, to: Date): string {
  const minutes = Math.max(1, Math.round((to.getTime() - from.getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.round(months / 12)}y`;
}

/** Maps a flashcard rating to a 0–100 session score contribution. */
export function ratingScore(rating: ReviewRating): number {
  return { AGAIN: 0, HARD: 60, GOOD: 85, EASY: 100 }[rating];
}

function toFsrs(card: SrsCardState, now: Date): Card {
  const elapsed = card.lastReview ? Math.max(0, Math.floor((now.getTime() - card.lastReview.getTime()) / 86_400_000)) : 0;
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: elapsed,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: STATE_TO_FSRS[card.state],
    ...(card.lastReview ? { last_review: card.lastReview } : {}),
  };
}

function fromFsrs(card: Card): SrsCardState {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: FSRS_TO_STATE[card.state],
    lastReview: card.last_review ? new Date(card.last_review) : null,
  };
}
