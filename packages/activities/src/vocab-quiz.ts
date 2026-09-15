import type { PracticeExercise } from "./grammar";

export interface QuizWord {
  term: string;
  definition: string;
  translation: string | null;
  example: string | null;
}

type Kind = "meaning" | "translation" | "gap" | "use";
const KINDS: Kind[] = ["meaning", "translation", "gap", "use"];

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds a vocabulary quiz from the learner's own dictionary without an AI call
 * (except free sentences, which the answer checker judges). Needs at least 4 words for distractors.
 */
export function buildVocabQuiz(words: QuizWord[], { count = 10, random = Math.random }: { count?: number; random?: () => number } = {}): PracticeExercise[] {
  const pool = words.filter((w) => w.term.trim() && w.definition.trim());
  if (pool.length < 4) return [];

  const picks = shuffle(pool, random).slice(0, count);
  const distractors = (key: keyof QuizWord, correct: string) =>
    shuffle(
      [...new Set(pool.map((w) => w[key]).filter((v): v is string => Boolean(v) && v !== correct))],
      random,
    ).slice(0, 3);

  return picks.map((word, index) => {
    const explanation = `“${word.term}” means ${word.definition}${word.translation ? ` (${word.translation})` : ""}.`;
    const gapRegex = new RegExp(`\\b${escapeRegExp(word.term)}\\b`, "i");
    const available: Kind[] = KINDS.filter((k) => {
      if (k === "translation") return Boolean(word.translation) && distractors("term", word.term).length >= 2;
      if (k === "gap") return Boolean(word.example && gapRegex.test(word.example));
      return true;
    });
    const preferred = KINDS[index % KINDS.length]!;
    const kind = available.includes(preferred) ? preferred : "meaning";
    const id = `q${index + 1}`;

    switch (kind) {
      case "translation":
        return {
          id,
          type: "question",
          prompt: `Which English word or phrase means “${word.translation}”?`,
          options: shuffle([word.term, ...distractors("term", word.term)], random),
          answer: word.term,
          acceptableAnswers: [],
          explanation,
        };
      case "gap": {
        const match = word.example!.match(gapRegex)![0];
        return {
          id,
          type: "fill_blank",
          prompt: word.example!.replace(gapRegex, "___"),
          options: [],
          answer: match,
          acceptableAnswers: [word.term],
          explanation,
        };
      }
      case "use":
        return {
          id,
          type: "fill_blank",
          prompt: `Write your own sentence using “${word.term}”.`,
          options: [],
          answer: word.example ?? `A correct sentence that uses “${word.term}” with the meaning: ${word.definition}`,
          acceptableAnswers: [],
          explanation,
        };
      default:
        return {
          id,
          type: "question",
          prompt: `What does “${word.term}” mean?`,
          options: shuffle([word.definition, ...distractors("definition", word.definition)], random),
          answer: word.definition,
          acceptableAnswers: [],
          explanation,
        };
    }
  });
}
