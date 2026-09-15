import { findGrammarTopic } from "@repo/core";
import { describe, expect, it } from "vitest";
import { grammarPracticeResult, normalizeAnswer, publicExercise, quickCheck, sanitizeExercises, type RawExercise } from "./grammar";

const base = { acceptableAnswers: [], explanation: "Because." };

describe("sanitizeExercises", () => {
  it("keeps valid exercises, fixes MC answer casing, drops broken ones and numbers ids", () => {
    const raw: RawExercise[] = [
      { ...base, type: "multiple_choice", prompt: "She ___ happy.", options: ["is", "are", "am"], answer: "IS" },
      { ...base, type: "multiple_choice", prompt: "No gap here", options: ["a", "b"], answer: "a" },
      { ...base, type: "fill_blank", prompt: "I ___ (go) yesterday.", options: ["x"], answer: "went" },
      { ...base, type: "reorder", prompt: "Make a question", options: ["you", "are", "how"], answer: "How are you?" },
      { ...base, type: "reorder", prompt: "Make a sentence", options: ["I", "am"], answer: "I am here" },
      { ...base, type: "correct_sentence", prompt: "She go to work.", options: [], answer: "She goes to work." },
    ];
    const out = sanitizeExercises(raw);
    expect(out.map((e) => e.type)).toEqual(["multiple_choice", "fill_blank", "reorder", "correct_sentence"]);
    expect(out[0]).toMatchObject({ id: "q1", answer: "is" });
    expect(out[1]?.options).toEqual([]);
    expect(publicExercise(out[0]!)).not.toHaveProperty("answer");
  });
});

describe("comprehension questions", () => {
  it("need options and a matching answer but no gap, and are checked exactly", () => {
    const [q] = sanitizeExercises([
      { ...base, type: "question", prompt: "Why did Maria take the bus?", options: ["Her bike was broken", "She was late"], answer: "her bike was broken" },
      { ...base, type: "question", prompt: "Where?", options: ["Home"], answer: "Home" },
    ]);
    expect(q).toMatchObject({ id: "q1", answer: "Her bike was broken" });
    expect(quickCheck(q!, "She was late")).toBe(false);
  });
});

describe("quickCheck", () => {
  const [mc, fill, fix] = sanitizeExercises([
    { ...base, type: "multiple_choice", prompt: "She ___ happy.", options: ["is", "are"], answer: "is" },
    { ...base, type: "fill_blank", prompt: "I ___ (go).", options: [], answer: "went", acceptableAnswers: ["did go"] },
    { ...base, type: "correct_sentence", prompt: "She go.", options: [], answer: "She goes." },
  ]);

  it("matches ignoring case and punctuation", () => {
    expect(normalizeAnswer("  She GOES. ")).toBe("she goes");
    expect(quickCheck(fix!, "she goes")).toBe(true);
    expect(quickCheck(fill!, "Did go")).toBe(true);
  });

  it("is final for multiple choice and defers free text to AI", () => {
    expect(quickCheck(mc!, "are")).toBe(false);
    expect(quickCheck(fix!, "She is going.")).toBeNull();
    expect(quickCheck(fill!, "")).toBe(false);
  });
});

describe("grammarPracticeResult", () => {
  it("scores answers and records wrong ones as grammar mistakes in the topic category", () => {
    const topic = findGrammarTopic("past-simple")!;
    const exercises = sanitizeExercises([
      { ...base, type: "fill_blank", prompt: "I ___ (go).", options: [], answer: "went" },
      { ...base, type: "fill_blank", prompt: "She ___ (see).", options: [], answer: "saw" },
    ]);
    const result = grammarPracticeResult(topic, exercises, [
      { exerciseId: "q1", given: "went", correct: true },
      { exerciseId: "q2", given: "seed", correct: false },
    ]);
    expect(result.score).toBe(50);
    expect(result.skill).toBe("GRAMMAR");
    expect(result.mistakes[0]).toMatchObject({ category: "past-simple", original: "seed", corrected: "saw" });
  });
});
