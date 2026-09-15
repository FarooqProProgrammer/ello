import type { ChatRequest } from "@repo/ai";
import type { GrammarTopic, LearnerContext, RecentMistake } from "@repo/core";
import { learnerProfile } from "./learner-prompt";

/** Short daily review built from the learner's own recent mistakes plus their weakest grammar topic. */
export function dailyReviewRequest(ctx: LearnerContext, mistakes: RecentMistake[], topic: GrammarTopic | null, count = 8): ChatRequest {
  return {
    system: [
      "You create a short daily review for an English learner.",
      learnerProfile(ctx),
      "",
      `Create exactly ${count} exercises:`,
      mistakes.length
        ? "- About half must practise the learner's OWN recent mistakes listed by the user: reuse their situations and the corrected forms (correct_sentence with a similar error, fill_blank targeting the corrected form, multiple_choice between the wrong and right form)."
        : null,
      topic ? `- The rest practise "${topic.title}" (${topic.summary}).` : "- The rest review common grammar for the learner's level.",
      "- Mix the types: multiple_choice (one ___ gap, 3–4 options, exactly one correct), fill_blank (one ___ gap; add a base-form hint in brackets for verbs), correct_sentence (a sentence with exactly one mistake), reorder (the answer's words/chunks shuffled).",
      "- Answers must be unambiguous; list genuine alternatives in acceptableAnswers. Don't reveal answers in prompts.",
    ]
      .filter(Boolean)
      .join("\n"),
    messages: [
      {
        role: "user",
        content: mistakes.length
          ? `Recent mistakes:\n${mistakes.map((m) => `- "${m.original}" → "${m.corrected}" (${m.category})`).join("\n")}`
          : "No recent mistakes recorded.",
      },
    ],
    maxTokens: 6000,
  };
}
