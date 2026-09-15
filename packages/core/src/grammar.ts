import { CEFR_LEVELS, levelIndex, type CefrLevel, type WeakArea } from "./domain";

export interface GrammarTopic {
  id: string;
  level: CefrLevel;
  title: string;
  summary: string;
  /** Mistake category ids (as produced by the tutor's grader) that belong to this topic. */
  categories: string[];
}

export const GRAMMAR_TOPICS: GrammarTopic[] = [
  // A1
  { id: "verb-to-be", level: "A1", title: "The verb “to be”", summary: "am, is, are for names, age, feelings and places", categories: ["verb-to-be", "subject-verb-agreement"] },
  { id: "present-simple", level: "A1", title: "Present simple", summary: "Habits, routines and facts: I work, she works", categories: ["present-simple", "third-person-s", "subject-verb-agreement"] },
  { id: "articles", level: "A1", title: "A, an and the", summary: "When to use a, an, the — or no article", categories: ["articles"] },
  { id: "plural-nouns", level: "A1", title: "Plural nouns", summary: "Regular and irregular plurals: cats, children, people", categories: ["plurals", "nouns"] },
  { id: "pronouns-possessives", level: "A1", title: "Pronouns & possessives", summary: "I / me / my / mine and their friends", categories: ["pronouns", "possessives"] },
  { id: "there-is-are", level: "A1", title: "There is / there are", summary: "Saying something exists: there is a bank near here", categories: ["there-is-are"] },
  { id: "can-ability", level: "A1", title: "Can for ability & requests", summary: "I can swim. Can you help me?", categories: ["can", "modals"] },
  // A2
  { id: "past-simple", level: "A2", title: "Past simple", summary: "Finished actions: worked, went, saw", categories: ["past-simple", "irregular-verbs"] },
  { id: "present-continuous", level: "A2", title: "Present continuous", summary: "Actions happening now and future arrangements", categories: ["present-continuous"] },
  { id: "future-forms", level: "A2", title: "Future: going to & will", summary: "Plans, predictions and quick decisions", categories: ["future", "going-to", "will"] },
  { id: "comparatives-superlatives", level: "A2", title: "Comparatives & superlatives", summary: "bigger, more expensive, the best", categories: ["comparatives", "superlatives"] },
  { id: "countable-uncountable", level: "A2", title: "Countable & uncountable nouns", summary: "some, any, much, many, a lot of", categories: ["countable-uncountable", "quantifiers"] },
  { id: "prepositions-time-place", level: "A2", title: "Prepositions of time & place", summary: "in, on, at for times and places", categories: ["prepositions"] },
  { id: "adverbs-frequency", level: "A2", title: "Adverbs of frequency & word order", summary: "always, usually, never — and where they go", categories: ["adverbs", "word-order"] },
  // B1
  { id: "present-perfect", level: "B1", title: "Present perfect", summary: "Experiences and results: I have been, she has finished", categories: ["present-perfect"] },
  { id: "past-continuous", level: "B1", title: "Past continuous", summary: "Background actions: I was cooking when you called", categories: ["past-continuous"] },
  { id: "first-second-conditional", level: "B1", title: "First & second conditional", summary: "If it rains, … / If I had more time, …", categories: ["conditionals"] },
  { id: "modals-obligation", level: "B1", title: "Modals: must, have to, should", summary: "Obligation, necessity and advice", categories: ["modals"] },
  { id: "passive-basic", level: "B1", title: "Passive voice", summary: "Present and past passive: it is made, it was built", categories: ["passive"] },
  { id: "gerunds-infinitives", level: "B1", title: "Gerunds & infinitives", summary: "enjoy doing, want to do, stop doing / stop to do", categories: ["gerunds-infinitives"] },
  { id: "relative-clauses", level: "B1", title: "Relative clauses", summary: "who, which, that, where, whose", categories: ["relative-clauses"] },
  // B2
  { id: "third-mixed-conditionals", level: "B2", title: "Third & mixed conditionals", summary: "If I had known, I would have… / would be…", categories: ["conditionals"] },
  { id: "reported-speech", level: "B2", title: "Reported speech", summary: "She said (that) she was tired; he asked if…", categories: ["reported-speech"] },
  { id: "present-perfect-continuous", level: "B2", title: "Present perfect continuous", summary: "I have been working here for five years", categories: ["present-perfect-continuous", "present-perfect"] },
  { id: "future-continuous-perfect", level: "B2", title: "Future continuous & future perfect", summary: "I'll be working / I'll have finished by then", categories: ["future"] },
  { id: "wish-if-only", level: "B2", title: "Wish & if only", summary: "Regrets and wishes about the present and past", categories: ["wish", "conditionals"] },
  { id: "modals-deduction", level: "B2", title: "Modals of deduction", summary: "must be, might have, can't have been", categories: ["modals"] },
  // C1
  { id: "inversion", level: "C1", title: "Inversion for emphasis", summary: "Never have I seen… / Not only did she…", categories: ["inversion", "word-order"] },
  { id: "cleft-sentences", level: "C1", title: "Cleft sentences", summary: "What I need is… / It was John who…", categories: ["cleft-sentences"] },
  { id: "participle-clauses", level: "C1", title: "Participle clauses", summary: "Having finished the report, she left", categories: ["participle-clauses"] },
  { id: "advanced-passive", level: "C1", title: "Advanced passive structures", summary: "It is said that… / He is thought to be…", categories: ["passive"] },
  // C2
  { id: "subjunctive-formal", level: "C2", title: "Subjunctive & formal structures", summary: "I suggest that he be… / Were it not for…", categories: ["subjunctive"] },
  { id: "ellipsis-substitution", level: "C2", title: "Ellipsis & substitution", summary: "Avoiding repetition naturally: so do I, I hope so", categories: ["ellipsis", "substitution"] },
  { id: "hedging-nuance", level: "C2", title: "Hedging & nuance", summary: "tends to, arguably, it would appear that…", categories: ["hedging", "word-choice"] },
];

export function findGrammarTopic(id: string): GrammarTopic | undefined {
  return GRAMMAR_TOPICS.find((t) => t.id === id);
}

/** Every category id the grader should prefer, so tutor mistakes map onto grammar topics. */
export const GRAMMAR_CATEGORY_IDS = [...new Set(GRAMMAR_TOPICS.flatMap((t) => t.categories))];

export interface TopicProgress {
  mastery: number; // 0–100
  attempts: number;
}

export interface TopicRecommendation {
  topic: GrammarTopic;
  reason: string;
}

/**
 * Up to `limit` topics: first those matching recent mistake categories (near the learner's level),
 * then unmastered topics at their level, then weak spots from the level below.
 */
export function recommendGrammarTopics(
  level: CefrLevel,
  weakAreas: WeakArea[],
  progress: Record<string, TopicProgress>,
  limit = 4,
): TopicRecommendation[] {
  const current = levelIndex(level);
  const picked = new Map<string, TopicRecommendation>();
  const mastery = (id: string) => progress[id]?.mastery ?? 0;
  const add = (topic: GrammarTopic, reason: string) => {
    if (picked.size < limit && !picked.has(topic.id)) picked.set(topic.id, { topic, reason });
  };

  for (const weak of [...weakAreas].sort((a, b) => b.count - a.count)) {
    const matches = GRAMMAR_TOPICS.filter(
      (t) => t.categories.includes(weak.category) && levelIndex(t.level) <= current + 1 && mastery(t.id) < 90,
    ).sort((a, b) => Math.abs(levelIndex(a.level) - current) - Math.abs(levelIndex(b.level) - current));
    const best = matches[0];
    if (best) add(best, `${weak.count} recent mistake${weak.count === 1 ? "" : "s"} with ${weak.category.replace(/-/g, " ")}`);
  }
  for (const t of GRAMMAR_TOPICS.filter((t) => t.level === level && mastery(t.id) < 80)) {
    add(t, progress[t.id]?.attempts ? `${Math.round(mastery(t.id))}% mastered — keep going` : `Next at your level (${level})`);
  }
  const below = CEFR_LEVELS[current - 1];
  if (below) for (const t of GRAMMAR_TOPICS.filter((t) => t.level === below && mastery(t.id) < 60)) add(t, `Review from ${below}`);

  return [...picked.values()];
}

/** Blends a new practice score into the topic's mastery so one bad day doesn't erase progress. */
export function nextMastery(previous: TopicProgress | undefined, sessionScore: number): number {
  if (!previous || previous.attempts === 0) return Math.round(sessionScore);
  return Math.round(previous.mastery * 0.6 + sessionScore * 0.4);
}
