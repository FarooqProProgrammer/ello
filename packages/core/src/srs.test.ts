import { describe, expect, it } from "vitest";
import { formatInterval, newCardState, previewIntervals, ratingScore, reviewCard } from "./srs";

const now = new Date("2026-09-15T10:00:00Z");

describe("srs", () => {
  it("creates a new card due now", () => {
    const card = newCardState(now);
    expect(card.state).toBe("NEW");
    expect(card.reps).toBe(0);
    expect(card.due.getTime()).toBe(now.getTime());
  });

  it("moves a card forward on GOOD and records the review", () => {
    const next = reviewCard(newCardState(now), "GOOD", now);
    expect(next.reps).toBe(1);
    expect(next.state).not.toBe("NEW");
    expect(next.due.getTime()).toBeGreaterThan(now.getTime());
    expect(next.lastReview?.getTime()).toBe(now.getTime());
  });

  it("schedules EASY further out than AGAIN", () => {
    const preview = previewIntervals(newCardState(now), now);
    expect(preview.EASY.getTime()).toBeGreaterThan(preview.AGAIN.getTime());
  });

  it("counts lapses when a review card is forgotten", () => {
    let card = reviewCard(newCardState(now), "EASY", now);
    const later = new Date(card.due.getTime() + 1000);
    card = reviewCard(card, "AGAIN", later);
    expect(card.lapses).toBe(1);
  });

  it("formats intervals compactly", () => {
    expect(formatInterval(now, new Date(now.getTime() + 5 * 60_000))).toBe("5m");
    expect(formatInterval(now, new Date(now.getTime() + 3 * 86_400_000))).toBe("3d");
  });

  it("scores ratings", () => {
    expect(ratingScore("AGAIN")).toBe(0);
    expect(ratingScore("EASY")).toBe(100);
  });
});
