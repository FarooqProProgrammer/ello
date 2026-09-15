import type { CefrLevel, LearnerContext } from "@repo/core";

const LEVEL_STYLE: Record<CefrLevel, string> = {
  A1: "Use very short sentences, the most common 500 words, present tense mostly. One idea per sentence.",
  A2: "Use short, simple sentences and everyday vocabulary. Avoid idioms and phrasal verbs unless explained.",
  B1: "Use clear, natural sentences. Introduce some common phrasal verbs and connectors.",
  B2: "Speak naturally with varied structures, common idioms, and topic-specific vocabulary.",
  C1: "Speak like an articulate native speaker. Use nuanced vocabulary, idioms, and complex structures.",
  C2: "Use fully native-level English, including subtle register, humour, and precise word choice.",
};

const GOAL_FOCUS: Record<string, string> = {
  CONVERSATION: "everyday conversation and small talk",
  BUSINESS: "workplace English: meetings, emails, presentations, negotiation",
  EXAM: "exam-style English (IELTS/TOEFL): formal structures, precise vocabulary, coherent arguments",
  PRONUNCIATION: "clear pronunciation, word stress and natural rhythm",
};

/** Shared learner profile block used at the top of every activity prompt. */
export function learnerProfile(ctx: LearnerContext): string {
  const lines = [
    `Learner level (CEFR): ${ctx.level}. ${LEVEL_STYLE[ctx.level]}`,
    ctx.goals.length ? `Goals: ${ctx.goals.map((g) => GOAL_FOCUS[g] ?? g).join("; ")}.` : null,
    ctx.weakAreas.length
      ? `Known weak areas (weave natural practice of these in, without lecturing): ${ctx.weakAreas
          .map((w) => `${w.category} (${w.type.toLowerCase()})`)
          .join(", ")}.`
      : null,
    ctx.nativeLanguage
      ? `The learner's native language is "${ctx.nativeLanguage}". When a grammar explanation would be hard to follow in English, add a one-sentence explanation in that language.`
      : "Give all explanations in simple English.",
    ctx.memories?.length
      ? [
          "What you remember about the learner from earlier conversations (use it naturally to personalise topics and examples; don't list it back or mention that you have a memory):",
          ...ctx.memories.map((m) => `- ${m}`),
        ].join("\n")
      : null,
  ];
  return lines.filter(Boolean).join("\n");
}
