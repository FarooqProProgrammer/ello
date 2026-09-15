import { formatInterval, previewIntervals, REVIEW_RATINGS } from "@repo/core";
import { getDueVocab } from "@repo/db";
import { requirePageUser as getCurrentUser } from "@/lib/current-user";
import { voiceMode } from "@repo/voice/server";
import { getEffectiveEnv } from "@/lib/ai-env";
import { translationLanguage } from "@/lib/labels";
import { ReviewSession, type ReviewCard } from "./review-session";

export default async function ReviewPage() {
  const user = await getCurrentUser();
  const now = new Date();
  const items = await getDueVocab(user.id, 40, now);

  const cards: ReviewCard[] = items.map((item) => {
    const preview = previewIntervals(item, now);
    return {
      id: item.id,
      term: item.term,
      definition: item.definition,
      example: item.example,
      partOfSpeech: item.partOfSpeech,
      translation: item.translation,
      usageNote: item.usageNote,
      usageNative: item.usageNative,
      source: item.source,
      isNew: item.state === "NEW",
      intervals: Object.fromEntries(REVIEW_RATINGS.map((r) => [r, formatInterval(now, preview[r])])) as ReviewCard["intervals"],
    };
  });

  return (
    <ReviewSession
      cards={cards}
      voiceMode={voiceMode(await getEffectiveEnv(user.id))}
      nativeLang={translationLanguage(user.nativeLanguage)}
    />
  );
}
