import { ratingScore, type ActivityResult, type ReviewRating } from "@repo/core";

/** Flashcards need no AI call: the session result is derived from the ratings given. */
export function flashcardSessionResult(ratings: ReviewRating[]): ActivityResult {
  const score = ratings.length ? Math.round(ratings.reduce((sum, r) => sum + ratingScore(r), 0) / ratings.length) : null;
  return { score, skill: "VOCAB", mistakes: [], newVocab: [] };
}
