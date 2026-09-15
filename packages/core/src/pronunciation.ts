export interface WordMatch {
  /** The word as written in the target sentence (with punctuation). */
  word: string;
  ok: boolean;
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}'\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Aligns what speech recognition heard with the target sentence (longest common subsequence)
 * and marks each target word as recognised or not. Score = % of target words recognised.
 */
export function compareWords(target: string, heard: string): { words: WordMatch[]; score: number } {
  const display = target.split(/\s+/).filter(Boolean);
  const t = display.map((w) => tokens(w).join(""));
  const h = tokens(heard);

  const dp: number[][] = Array.from({ length: t.length + 1 }, () => new Array<number>(h.length + 1).fill(0));
  for (let i = t.length - 1; i >= 0; i--) {
    for (let j = h.length - 1; j >= 0; j--) {
      dp[i]![j] = t[i] && t[i] === h[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  const matched = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < t.length && j < h.length) {
    if (t[i] && t[i] === h[j]) {
      matched.add(i);
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      i++;
    } else {
      j++;
    }
  }

  const words = display.map((word, index) => ({ word, ok: !t[index] || matched.has(index) }));
  const scorable = t.filter(Boolean).length || 1;
  const score = Math.round((words.filter((w, index) => t[index] && w.ok).length / scorable) * 100);
  return { words, score };
}
