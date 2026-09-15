import { getDueVocab } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";

/** Due flashcards for offline review (cached by the service worker). */
export async function GET() {
  try {
    const user = await getCurrentUser();
    const items = await getDueVocab(user.id, 100);
    return NextResponse.json({
      savedAt: new Date().toISOString(),
      cards: items.map((v) => ({ id: v.id, term: v.term, definition: v.definition, translation: v.translation, example: v.example })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
