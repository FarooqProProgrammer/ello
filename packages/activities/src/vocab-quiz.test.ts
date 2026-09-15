import { describe, expect, it } from "vitest";
import { buildVocabQuiz, type QuizWord } from "./vocab-quiz";

const words: QuizWord[] = [
  { term: "reluctant", definition: "not wanting to do something", translation: "ہچکچاتا", example: "She was reluctant to leave." },
  { term: "give up", definition: "to stop trying", translation: "ہار ماننا", example: "Don't give up now." },
  { term: "improve", definition: "to make better", translation: "بہتر کرنا", example: null },
  { term: "confident", definition: "sure of yourself", translation: null, example: "I feel confident today." },
  { term: "commute", definition: "travel to work", translation: "آنا جانا", example: "My commute is long." },
];

// Deterministic pseudo-random for stable tests.
function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

describe("buildVocabQuiz", () => {
  it("needs at least 4 words", () => {
    expect(buildVocabQuiz(words.slice(0, 3))).toEqual([]);
  });

  it("creates valid questions whose answers are among the options", () => {
    const quiz = buildVocabQuiz(words, { random: seeded(7) });
    expect(quiz).toHaveLength(5);
    for (const q of quiz) {
      if (q.type === "question") {
        expect(q.options).toContain(q.answer);
        expect(new Set(q.options).size).toBe(q.options.length);
      }
      if (q.type === "fill_blank" && q.prompt.includes("___")) {
        expect(q.acceptableAnswers.length).toBeGreaterThan(0);
      }
    }
    expect(quiz.map((q) => q.id)).toEqual(["q1", "q2", "q3", "q4", "q5"]);
  });

  it("blanks the term inside its example sentence", () => {
    const quiz = buildVocabQuiz(words, { count: 20, random: seeded(3) });
    const gap = quiz.find((q) => q.type === "fill_blank" && q.prompt.includes("___"));
    expect(gap?.prompt).not.toMatch(new RegExp(gap!.answer, "i"));
  });
});
