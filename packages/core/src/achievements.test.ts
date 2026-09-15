import { describe, expect, it } from "vitest";
import { evaluateAchievements, halfHourSlot, isValidTimeZone, localClock, longestStreak, type AchievementStats } from "./achievements";

const base: AchievementStats = {
  streak: 0,
  bestStreak: 0,
  words: 0,
  knownWords: 0,
  messages: 0,
  chats: 0,
  grammarSessions: 0,
  grammarMastered: 0,
  dailyCompleted: 0,
  writings: 0,
  readings: 0,
  listenings: 0,
  pronunciationAttempts: 0,
  ieltsBestBand: 0,
  level: "A1",
};

describe("achievements", () => {
  it("earns badges when goals are met and caps progress", () => {
    const result = evaluateAchievements({ ...base, bestStreak: 8, words: 12, chats: 3, level: "B2" });
    const byId = Object.fromEntries(result.map((r) => [r.def.id, r]));
    expect(byId["streak-7"]?.earned).toBe(true);
    expect(byId["streak-30"]).toMatchObject({ earned: false, current: 8, goal: 30 });
    expect(byId["words-10"]).toMatchObject({ earned: true, current: 10 });
    expect(byId["first-chat"]?.earned).toBe(true);
    expect(byId["level-b1"]?.earned).toBe(true);
    expect(byId["ielts-6"]?.earned).toBe(false);
  });

  it("finds the longest run of consecutive days", () => {
    expect(longestStreak(["2026-09-01", "2026-09-02", "2026-09-04", "2026-09-05", "2026-09-06", "2026-09-06"])).toBe(3);
    expect(longestStreak([])).toBe(0);
  });
});

describe("reminder time helpers", () => {
  it("formats local time and rounds to half hours", () => {
    expect(localClock(new Date("2026-09-15T15:47:00Z"), "Asia/Karachi")).toEqual({ dateKey: "2026-09-15", hhmm: "20:47" });
    expect(localClock(new Date("2026-09-15T20:10:00Z"), "Asia/Karachi").dateKey).toBe("2026-09-16");
    expect(halfHourSlot("20:47")).toBe("20:30");
    expect(halfHourSlot("09:05")).toBe("09:00");
  });

  it("validates time zones", () => {
    expect(isValidTimeZone("Asia/Karachi")).toBe(true);
    expect(isValidTimeZone("Mars/Base")).toBe(false);
  });
});
