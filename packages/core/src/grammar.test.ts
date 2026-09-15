import { describe, expect, it } from "vitest";
import { CEFR_LEVELS } from "./domain";
import { findGrammarTopic, GRAMMAR_CATEGORY_IDS, GRAMMAR_TOPICS, nextMastery, recommendGrammarTopics } from "./grammar";

describe("grammar topics", () => {
  it("have unique ids and cover every level", () => {
    expect(new Set(GRAMMAR_TOPICS.map((t) => t.id)).size).toBe(GRAMMAR_TOPICS.length);
    for (const level of CEFR_LEVELS) expect(GRAMMAR_TOPICS.some((t) => t.level === level)).toBe(true);
    expect(GRAMMAR_CATEGORY_IDS).toContain("articles");
    expect(findGrammarTopic("past-simple")?.level).toBe("A2");
  });
});

describe("recommendGrammarTopics", () => {
  it("puts topics matching recent mistakes first", () => {
    const recs = recommendGrammarTopics("B1", [{ category: "articles", type: "GRAMMAR", count: 5 }], {});
    expect(recs[0]?.topic.id).toBe("articles");
    expect(recs[0]?.reason).toContain("5 recent mistakes");
    expect(recs.length).toBeLessThanOrEqual(4);
  });

  it("skips mastered topics and fills with the learner's level", () => {
    const recs = recommendGrammarTopics("A1", [], { "verb-to-be": { mastery: 95, attempts: 3 } });
    expect(recs.map((r) => r.topic.id)).not.toContain("verb-to-be");
    expect(recs.every((r) => r.topic.level === "A1")).toBe(true);
  });
});

describe("nextMastery", () => {
  it("uses the first score directly, then blends", () => {
    expect(nextMastery(undefined, 70)).toBe(70);
    expect(nextMastery({ mastery: 80, attempts: 2 }, 30)).toBe(60);
  });
});
