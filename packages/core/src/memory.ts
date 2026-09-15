export const MEMORY_FACT_MAX_LENGTH = 160;

export function normalizeFact(fact: string): string {
  return fact.replace(/\s+/g, " ").trim().replace(/[.!]+$/, "");
}

function comparable(fact: string): string {
  return normalizeFact(fact)
    .toLowerCase()
    .replace(/^(the )?learner('s)? /, "")
    .replace(/[^\p{L}\p{N} ]/gu, "");
}

/** True when the fact already exists (ignoring case, punctuation and a leading "The learner"). */
export function isDuplicateFact(existing: string[], fact: string): boolean {
  const c = comparable(fact);
  return existing.some((e) => {
    const other = comparable(e);
    return other === c || (c.length > 20 && (other.includes(c) || c.includes(other)));
  });
}

/** Cleans model-proposed facts: trims, enforces length, removes duplicates, keeps at most `limit`. */
export function acceptNewFacts(existing: string[], proposed: string[], limit = 2): string[] {
  const accepted: string[] = [];
  for (const raw of proposed) {
    const fact = normalizeFact(raw);
    if (fact.length < 8 || fact.length > MEMORY_FACT_MAX_LENGTH) continue;
    if (isDuplicateFact([...existing, ...accepted], fact)) continue;
    accepted.push(fact);
    if (accepted.length >= limit) break;
  }
  return accepted;
}
