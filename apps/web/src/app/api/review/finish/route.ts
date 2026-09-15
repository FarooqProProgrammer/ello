import { flashcardSessionResult } from "@repo/activities";
import { REVIEW_RATINGS } from "@repo/core";
import { createSession, recordActivityResult } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, parseBody } from "@/lib/api";

const bodySchema = z.object({ ratings: z.array(z.enum(REVIEW_RATINGS)).min(1).max(500) });

export async function POST(req: Request) {
  try {
    const { ratings } = await parseBody(req, bodySchema);
    const user = await getCurrentUser();
    const session = await createSession(user.id, "flashcards", "Flashcard review");
    const result = flashcardSessionResult(ratings);
    const { levelChange } = await recordActivityResult({ userId: user.id, sessionId: session.id, result, endSession: true });
    return NextResponse.json({ score: result.score, levelChange });
  } catch (err) {
    return errorResponse(err);
  }
}
