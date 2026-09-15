import type { LearnerContext } from "@repo/core";
import { describe, expect, it } from "vitest";
import { flashcardSessionResult } from "./flashcards";
import { PLACEMENT_QUESTIONS, publicPlacementQuestions, scorePlacement } from "./placement";
import { locatableCorrections, tutorChatActivity, tutorReplyRequest, type TutorAnalysis } from "./tutor-chat";

const ctx: LearnerContext = {
  userId: "u1",
  level: "A2",
  goals: ["BUSINESS"],
  nativeLanguage: "ur",
  weakAreas: [{ category: "past-simple", type: "GRAMMAR", count: 4 }],
  recentMistakes: [],
};

describe("tutor chat", () => {
  it("adapts the reply prompt to level, goals, weak areas and native language", () => {
    const req = tutorReplyRequest(ctx, "work", []);
    expect(req.system).toContain("A2");
    expect(req.system).toContain("workplace English");
    expect(req.system).toContain("past-simple");
    expect(req.system).toContain('"ur"');
    expect(req.messages[0]?.role).toBe("user");
  });

  it("includes remembered facts when memory is on", () => {
    const system = tutorReplyRequest({ ...ctx, memories: ["Works as a MERN developer", "Has a job interview on Friday"] }, "free", []).system!;
    expect(system).toContain("- Works as a MERN developer");
    expect(system).toContain("don't list it back");
    expect(tutorReplyRequest(ctx, "free", []).system).not.toContain("What you remember");
  });

  it("adds adaptive difficulty guidance only when not normal", () => {
    expect(tutorReplyRequest(ctx, "free", [], null, "simplify").system).toContain("struggling");
    expect(tutorReplyRequest(ctx, "free", [], null, "stretch").system).toContain("stretch them");
    expect(tutorReplyRequest(ctx, "free", []).system).not.toContain("Adaptive difficulty");
  });

  it("falls back to free talk for unknown topics", () => {
    expect(tutorReplyRequest(ctx, "nope", []).system).toContain("anything the learner wants");
  });

  it("follows a learner-written scenario while keeping the tutor rules", () => {
    const system = tutorReplyRequest(ctx, { title: "Airport customs", description: "You are a strict customs officer." }, []).system!;
    expect(system).toContain('"Airport customs"');
    expect(system).toContain("You are a strict customs officer.");
    expect(system).toContain("A2");
    expect(system).toContain("Keep replies short");
  });

  it("evaluates analysis into an ActivityResult", () => {
    const output: TutorAnalysis = {
      corrections: [
        { type: "GRAMMAR", category: " Past-Simple ", original: "I go", corrected: "I went", explanation: "Use past tense." },
      ],
      betterVersion: "Yesterday I went to work.",
      newWords: [
        { term: "commute", definition: "travel to work", example: "My commute is long." },
        { term: "a", definition: "a", example: "a" },
        { term: "b", definition: "b", example: "b" },
        { term: "c", definition: "c", example: "c" },
      ],
      score: 123.4,
    };
    const result = tutorChatActivity.evaluate(output, ctx);
    expect(result.score).toBe(100);
    expect(result.skill).toBe("WRITING");
    expect(result.mistakes[0]?.category).toBe("past-simple");
    expect(result.newVocab).toHaveLength(3);
  });

  it("drops corrections that cannot be highlighted", () => {
    const output = {
      corrections: [
        { type: "GRAMMAR", category: "x", original: "I go", corrected: "I went", explanation: "" },
        { type: "GRAMMAR", category: "x", original: "not there", corrected: "y", explanation: "" },
      ],
      betterVersion: "",
      newWords: [],
      score: 50,
    } satisfies TutorAnalysis;
    expect(locatableCorrections("Yesterday I go to work", output)).toHaveLength(1);
  });
});

describe("writing coach", () => {
  it("keeps only highlightable corrections, clamps scores and drops unknown lesson ids", async () => {
    const { writingResult } = await import("./writing");
    const text = "Yesterday I go to office and meet my manager.";
    const { feedback, result } = writingResult(text, {
      score: 140,
      ieltsBand: 6.3,
      summary: "Good start.",
      criteria: [],
      corrections: [
        { type: "GRAMMAR", category: "Past-Simple", original: "I go", corrected: "I went", explanation: "Past tense." },
        { type: "GRAMMAR", category: "articles", original: "not in text", corrected: "x", explanation: "" },
      ],
      improvedVersion: "Yesterday I went to the office and met my manager.",
      strengths: [],
      improvements: [],
      vocabularyUpgrades: [],
      grammarTopicIds: ["past-simple", "made-up"],
    });
    expect(feedback.score).toBe(100);
    expect(feedback.ieltsBand).toBe(6.5);
    expect(feedback.corrections).toHaveLength(1);
    expect(feedback.grammarTopicIds).toEqual(["past-simple"]);
    expect(result).toMatchObject({ skill: "WRITING", score: 100 });
    expect(result.mistakes[0]?.category).toBe("past-simple");
  });
});

describe("placement", () => {
  it("has 3 questions per level and valid answer indexes", () => {
    for (const level of ["A1", "A2", "B1", "B2", "C1", "C2"]) {
      expect(PLACEMENT_QUESTIONS.filter((q) => q.level === level)).toHaveLength(3);
    }
    for (const q of PLACEMENT_QUESTIONS) expect(q.options[q.answerIndex]).toBeDefined();
  });

  it("never leaks answers to the client", () => {
    expect(publicPlacementQuestions().some((q) => "answerIndex" in q)).toBe(false);
  });

  it("scores all-correct as C2 and all-wrong as A1", () => {
    const allRight = PLACEMENT_QUESTIONS.map((q) => ({ questionId: q.id, selectedIndex: q.answerIndex }));
    expect(scorePlacement(allRight)).toMatchObject({ level: "C2", score: 100 });
    const allWrong = PLACEMENT_QUESTIONS.map((q) => ({ questionId: q.id, selectedIndex: (q.answerIndex + 1) % 4 }));
    expect(scorePlacement(allWrong)).toMatchObject({ level: "A1", score: 0 });
  });
});

describe("flashcards", () => {
  it("averages rating scores", () => {
    expect(flashcardSessionResult(["GOOD", "EASY", "AGAIN"]).score).toBe(62);
    expect(flashcardSessionResult([]).score).toBeNull();
  });
});
