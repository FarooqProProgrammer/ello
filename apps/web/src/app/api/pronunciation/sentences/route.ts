import { pronunciationSentencesRequest, pronunciationSentencesSchema } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { translationLanguage } from "@repo/core";
import { getLearnerContext } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse } from "@/lib/api";

export async function POST() {
  try {
    const user = await getCurrentUser();
    const [ctx, env] = await Promise.all([getLearnerContext(user.id), aiEnvFor(user.id)]);
    const { sentences } = await getProvider("generator", env).structured(
      pronunciationSentencesRequest(ctx, translationLanguage(user.nativeLanguage).name),
      pronunciationSentencesSchema,
      "pronunciation_sentences",
    );
    return NextResponse.json({ sentences: sentences.filter((s) => s.text.trim()).slice(0, 8) });
  } catch (err) {
    return errorResponse(err);
  }
}
