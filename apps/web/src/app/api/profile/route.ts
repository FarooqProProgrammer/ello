import { CEFR_LEVELS, GOALS, isValidTimeZone } from "@repo/core";
import { updateProfile } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, parseBody } from "@/lib/api";

const bodySchema = z
  .object({
    name: z.string().max(60).nullable(),
    nativeLanguage: z.string().max(10).nullable(),
    explainInNative: z.boolean(),
    cefrLevel: z.enum(CEFR_LEVELS),
    goals: z.array(z.enum(GOALS)).max(4),
    voiceEnabled: z.boolean(),
    memoryEnabled: z.boolean(),
    reminderEnabled: z.boolean(),
    reminderTime: z.string().regex(/^([01]\d|2[0-3]):(00|30)$/, "Reminder time must be on the hour or half hour"),
    timeZone: z.string().max(60).refine(isValidTimeZone, "Unknown time zone"),
    placementCompleted: z.boolean(),
  })
  .partial();

export async function PATCH(req: Request) {
  try {
    const update = await parseBody(req, bodySchema);
    const user = await getCurrentUser();
    const saved = await updateProfile(user.id, update);
    return NextResponse.json({ ok: true, cefrLevel: saved.cefrLevel });
  } catch (err) {
    return errorResponse(err);
  }
}
