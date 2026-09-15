import { scorePlacement } from "@repo/activities";
import { CEFR_LEVELS, GOALS } from "@repo/core";
import { createSession, recordActivityResult, updateProfile } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { emit, EVENTS } from "@repo/jobs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, parseBody } from "@/lib/api";

const bodySchema = z.object({
  name: z.string().max(60).optional(),
  goals: z.array(z.enum(GOALS)).max(4),
  nativeLanguage: z.string().max(10).nullable(),
  explainInNative: z.boolean(),
  /** Either placement answers, or a self-chosen level when the test is skipped. */
  answers: z.array(z.object({ questionId: z.string(), selectedIndex: z.number().int() })).optional(),
  chosenLevel: z.enum(CEFR_LEVELS).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, bodySchema);
    const user = await getCurrentUser();

    const outcome = body.answers?.length ? scorePlacement(body.answers) : null;
    const level = outcome?.level ?? body.chosenLevel ?? "A1";

    await updateProfile(user.id, {
      ...(body.name?.trim() ? { name: body.name.trim() } : {}),
      goals: body.goals,
      nativeLanguage: body.nativeLanguage,
      explainInNative: body.explainInNative && Boolean(body.nativeLanguage),
      cefrLevel: level,
      placementCompleted: true,
    });

    if (outcome) {
      const session = await createSession(user.id, "placement", "Placement test");
      await recordActivityResult({
        userId: user.id,
        sessionId: session.id,
        result: { score: outcome.score, skill: "GRAMMAR", mistakes: [], newVocab: [] },
        endSession: true,
      });
    }

    // Background: write the first recommended grammar lessons for the new level.
    await emit(EVENTS.lessonsPrewarm, { userId: user.id });
    return NextResponse.json({ level, outcome });
  } catch (err) {
    return errorResponse(err);
  }
}
