import { estimatePlacementLevel, type CefrLevel, type PlacementAnswer } from "@repo/core";

export interface PlacementQuestion {
  id: string;
  level: CefrLevel;
  kind: "grammar" | "vocab" | "reading";
  prompt: string;
  /** Optional short passage for reading questions. */
  passage?: string;
  options: string[];
  answerIndex: number;
}

/** Static bank: works without an API key and scores deterministically. 3 questions per level. */
export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  { id: "a1-1", level: "A1", kind: "grammar", prompt: "She ___ a teacher.", options: ["am", "is", "are", "be"], answerIndex: 1 },
  { id: "a1-2", level: "A1", kind: "vocab", prompt: "Which one is a colour?", options: ["table", "green", "happy", "run"], answerIndex: 1 },
  { id: "a1-3", level: "A1", kind: "grammar", prompt: "I ___ coffee every morning.", options: ["drinks", "drinking", "drink", "am drink"], answerIndex: 2 },

  { id: "a2-1", level: "A2", kind: "grammar", prompt: "Yesterday we ___ to the cinema.", options: ["go", "went", "gone", "were go"], answerIndex: 1 },
  { id: "a2-2", level: "A2", kind: "vocab", prompt: "I'm hungry. Can we ___ lunch now?", options: ["make", "take", "have", "do"], answerIndex: 2 },
  { id: "a2-3", level: "A2", kind: "grammar", prompt: "This bag is ___ than that one.", options: ["more heavy", "heavier", "heaviest", "most heavy"], answerIndex: 1 },

  { id: "b1-1", level: "B1", kind: "grammar", prompt: "I ___ here since 2019.", options: ["live", "am living", "have lived", "lived"], answerIndex: 2 },
  { id: "b1-2", level: "B1", kind: "vocab", prompt: "Could you ___ the meeting until Friday? I'm busy today.", options: ["put off", "put on", "put up", "put out"], answerIndex: 0 },
  {
    id: "b1-3",
    level: "B1",
    kind: "reading",
    passage: "Maria usually cycles to work, but this week her bike is being repaired, so she has been taking the bus.",
    prompt: "Why is Maria taking the bus?",
    options: ["She prefers the bus.", "Her bike is broken.", "She moved house.", "The weather is bad."],
    answerIndex: 1,
  },

  { id: "b2-1", level: "B2", kind: "grammar", prompt: "If I ___ about the traffic, I would have left earlier.", options: ["knew", "had known", "would know", "have known"], answerIndex: 1 },
  { id: "b2-2", level: "B2", kind: "vocab", prompt: "The new policy had a significant ___ on sales.", options: ["affect", "impact", "effort", "result"], answerIndex: 1 },
  { id: "b2-3", level: "B2", kind: "grammar", prompt: "The report ___ by the time the manager arrives.", options: ["will finish", "will have been finished", "is finishing", "has finished"], answerIndex: 1 },

  { id: "c1-1", level: "C1", kind: "grammar", prompt: "___ had we sat down than the fire alarm went off.", options: ["Hardly", "No sooner", "Barely", "Scarcely"], answerIndex: 1 },
  { id: "c1-2", level: "C1", kind: "vocab", prompt: "Her argument was so ___ that nobody could find a flaw in it.", options: ["cogent", "tentative", "frivolous", "ambiguous"], answerIndex: 0 },
  {
    id: "c1-3",
    level: "C1",
    kind: "reading",
    passage: "While the proposal was ostensibly about efficiency, critics argued it was a thinly veiled attempt to centralise control.",
    prompt: "What did critics believe?",
    options: [
      "The proposal would improve efficiency.",
      "The real aim was to concentrate power.",
      "The proposal was too detailed.",
      "Control should be decentralised immediately.",
    ],
    answerIndex: 1,
  },

  { id: "c2-1", level: "C2", kind: "vocab", prompt: "He was ___ in his praise, mentioning every single contributor by name.", options: ["fulsome", "fractious", "facetious", "fastidious"], answerIndex: 0 },
  { id: "c2-2", level: "C2", kind: "grammar", prompt: "Were the committee ___ the proposal, the project would stall.", options: ["rejecting", "to reject", "rejected", "having rejected"], answerIndex: 1 },
  { id: "c2-3", level: "C2", kind: "vocab", prompt: "The novel's plot is ___ ; it twists so often that readers lose track.", options: ["byzantine", "pellucid", "laconic", "prosaic"], answerIndex: 0 },
];

/** Public version sent to the browser (no answers). */
export function publicPlacementQuestions() {
  return PLACEMENT_QUESTIONS.map(({ answerIndex: _a, ...q }) => q);
}

export interface PlacementSubmission {
  questionId: string;
  selectedIndex: number;
}

export interface PlacementOutcome {
  level: CefrLevel;
  score: number;
  perLevel: Record<CefrLevel, { correct: number; total: number }>;
}

export function scorePlacement(submissions: PlacementSubmission[]): PlacementOutcome {
  const byId = new Map(PLACEMENT_QUESTIONS.map((q) => [q.id, q]));
  const answers: PlacementAnswer[] = [];
  const perLevel = {} as PlacementOutcome["perLevel"];
  for (const s of submissions) {
    const q = byId.get(s.questionId);
    if (!q) continue;
    const correct = q.answerIndex === s.selectedIndex;
    answers.push({ level: q.level, correct });
    const entry = (perLevel[q.level] ??= { correct: 0, total: 0 });
    entry.total++;
    if (correct) entry.correct++;
  }
  const correctCount = answers.filter((a) => a.correct).length;
  return {
    level: estimatePlacementLevel(answers),
    score: answers.length ? Math.round((correctCount / answers.length) * 100) : 0,
    perLevel,
  };
}
