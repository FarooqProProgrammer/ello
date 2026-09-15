export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export const GOALS = ["CONVERSATION", "BUSINESS", "EXAM", "PRONUNCIATION"] as const;
export type Goal = (typeof GOALS)[number];

export const SKILLS = ["SPEAKING", "LISTENING", "READING", "WRITING", "GRAMMAR", "VOCAB"] as const;
export type Skill = (typeof SKILLS)[number];

export const MISTAKE_TYPES = ["GRAMMAR", "VOCAB", "PRONUNCIATION", "SPELLING"] as const;
export type MistakeType = (typeof MISTAKE_TYPES)[number];

export const CEFR_DESCRIPTIONS: Record<CefrLevel, string> = {
  A1: "Beginner — simple phrases and everyday expressions",
  A2: "Elementary — routine tasks and familiar topics",
  B1: "Intermediate — main points on familiar matters, simple connected text",
  B2: "Upper-intermediate — fluent interaction, clear detailed text",
  C1: "Advanced — flexible, effective language for social, academic and professional use",
  C2: "Proficient — near-native precision and nuance",
};

export function levelIndex(level: CefrLevel): number {
  return CEFR_LEVELS.indexOf(level);
}

export function clampLevel(index: number): CefrLevel {
  const i = Math.max(0, Math.min(CEFR_LEVELS.length - 1, Math.round(index)));
  return CEFR_LEVELS[i]!;
}

export function isCefrLevel(value: string): value is CefrLevel {
  return (CEFR_LEVELS as readonly string[]).includes(value);
}

export interface WeakArea {
  category: string;
  type: MistakeType;
  count: number;
}

export interface RecentMistake {
  type: MistakeType;
  category: string;
  original: string;
  corrected: string;
}

/** Everything an activity needs to adapt to the learner. */
export interface LearnerContext {
  userId: string;
  name?: string | null;
  level: CefrLevel;
  goals: Goal[];
  nativeLanguage?: string | null;
  weakAreas: WeakArea[];
  recentMistakes: RecentMistake[];
  /** Facts remembered about the learner from earlier chats (empty when memory is off). */
  memories?: string[];
}

export interface MistakeRecord {
  type: MistakeType;
  category: string;
  original: string;
  corrected: string;
  explanation: string;
}

export interface NewVocab {
  term: string;
  definition: string;
  example?: string;
}

/** Common result every activity produces; drives progress and flashcard creation. */
export interface ActivityResult {
  score: number | null; // 0–100, null when the activity isn't scored
  skill: Skill | null;
  mistakes: MistakeRecord[];
  newVocab: NewVocab[];
}
