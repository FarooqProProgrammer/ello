import { getSession, recordActivityResult } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, HttpError, parseBody } from "@/lib/api";

const bodySchema = z.object({ scores: z.array(z.number().min(0).max(100)).max(200) });

/** Closes a chat with its average message score; may move the learner's level. */
export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    const { scores } = await parseBody(req, bodySchema);
    const user = await getCurrentUser();
    const session = await getSession(user.id, sessionId);
    if (!session) throw new HttpError(404, "Chat not found.");
    if (session.endedAt || scores.length === 0) return NextResponse.json({ levelChange: null });

    const score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const { levelChange } = await recordActivityResult({
      userId: user.id,
      sessionId,
      result: { score, skill: null, mistakes: [], newVocab: [] },
      endSession: true,
    });
    return NextResponse.json({ score, levelChange });
  } catch (err) {
    return errorResponse(err);
  }
}
