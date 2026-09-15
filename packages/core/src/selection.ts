/**
 * Turns a text selection into something worth looking up: trims punctuation/whitespace and
 * rejects selections that are empty, too long, not English (Latin script), or more than 6 words.
 */
export function cleanSelection(raw: string): string | null {
  const text = raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, "");
  if (!text || text.length > 60) return null;
  if (text.split(" ").length > 6) return null;
  if (!/\p{Script=Latin}/u.test(text)) return null;
  return text;
}
