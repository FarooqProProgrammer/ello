import { levelIndex, type CefrLevel } from "./domain";

export interface AchievementStats {
  streak: number;
  bestStreak: number;
  words: number;
  knownWords: number;
  messages: number;
  chats: number;
  grammarSessions: number;
  grammarMastered: number;
  dailyCompleted: number;
  writings: number;
  readings: number;
  listenings: number;
  pronunciationAttempts: number;
  ieltsBestBand: number;
  level: CefrLevel;
}

export type AchievementCategory = "streak" | "words" | "speaking" | "grammar" | "skills";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  progress: (s: AchievementStats) => { current: number; goal: number };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "streak-3", title: "On a roll", description: "Practise 3 days in a row", category: "streak", progress: (s) => ({ current: s.bestStreak, goal: 3 }) },
  { id: "streak-7", title: "Week warrior", description: "Practise 7 days in a row", category: "streak", progress: (s) => ({ current: s.bestStreak, goal: 7 }) },
  { id: "streak-30", title: "Unstoppable", description: "Practise 30 days in a row", category: "streak", progress: (s) => ({ current: s.bestStreak, goal: 30 }) },
  { id: "daily-7", title: "Daily habit", description: "Complete 7 daily reviews", category: "streak", progress: (s) => ({ current: s.dailyCompleted, goal: 7 }) },
  { id: "words-10", title: "Word collector", description: "Save 10 words to your dictionary", category: "words", progress: (s) => ({ current: s.words, goal: 10 }) },
  { id: "words-100", title: "Wordsmith", description: "Save 100 words", category: "words", progress: (s) => ({ current: s.words, goal: 100 }) },
  { id: "known-50", title: "Memory master", description: "Get 50 flashcards to Known", category: "words", progress: (s) => ({ current: s.knownWords, goal: 50 }) },
  { id: "first-chat", title: "Hello, Ello", description: "Have your first tutor chat", category: "speaking", progress: (s) => ({ current: s.chats, goal: 1 }) },
  { id: "messages-100", title: "Chatterbox", description: "Send 100 messages to the tutor", category: "speaking", progress: (s) => ({ current: s.messages, goal: 100 }) },
  { id: "pronunciation-20", title: "Clear speaker", description: "Do 20 pronunciation attempts", category: "speaking", progress: (s) => ({ current: s.pronunciationAttempts, goal: 20 }) },
  { id: "ielts-6", title: "Band 6+", description: "Score band 6 or higher in an IELTS speaking test", category: "speaking", progress: (s) => ({ current: s.ieltsBestBand, goal: 6 }) },
  { id: "grammar-first", title: "Rule learner", description: "Finish a grammar practice", category: "grammar", progress: (s) => ({ current: s.grammarSessions, goal: 1 }) },
  { id: "grammar-master-5", title: "Grammar guru", description: "Master 5 grammar topics (80%+)", category: "grammar", progress: (s) => ({ current: s.grammarMastered, goal: 5 }) },
  { id: "writer-5", title: "Writer", description: "Get feedback on 5 pieces of writing", category: "skills", progress: (s) => ({ current: s.writings, goal: 5 }) },
  { id: "reader-5", title: "Bookworm", description: "Finish 5 reading texts", category: "skills", progress: (s) => ({ current: s.readings, goal: 5 }) },
  { id: "listener-5", title: "Good listener", description: "Finish 5 listening tasks", category: "skills", progress: (s) => ({ current: s.listenings, goal: 5 }) },
  { id: "level-b1", title: "Intermediate", description: "Reach level B1", category: "skills", progress: (s) => ({ current: levelIndex(s.level), goal: levelIndex("B1") }) },
];

export interface EvaluatedAchievement {
  def: AchievementDef;
  current: number;
  goal: number;
  earned: boolean;
}

export function evaluateAchievements(stats: AchievementStats): EvaluatedAchievement[] {
  return ACHIEVEMENTS.map((def) => {
    const { current, goal } = def.progress(stats);
    return { def, current: Math.min(current, goal), goal, earned: current >= goal };
  });
}

/** Longest run of consecutive calendar days in a list of YYYY-MM-DD keys. */
export function longestStreak(dayKeys: string[]): number {
  const days = [...new Set(dayKeys)].sort();
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const key of days) {
    const t = Date.parse(`${key}T00:00:00Z`);
    run = previous !== null && t - previous === 86_400_000 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = t;
  }
  return best;
}

// ---------------- Reminder time helpers ----------------

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Local date key and HH:MM clock time in a time zone. */
export function localClock(date: Date, timeZone: string): { dateKey: string; hhmm: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return { dateKey: `${parts.year}-${parts.month}-${parts.day}`, hhmm: `${hour}:${parts.minute}` };
}

/** Rounds HH:MM down to the half hour, matching the reminder cron cadence. */
export function halfHourSlot(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return `${String(h).padStart(2, "0")}:${m < 30 ? "00" : "30"}`;
}
