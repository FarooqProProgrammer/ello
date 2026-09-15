import { getCurrentUser } from "@/lib/current-user";
import { ensureDailySet } from "@repo/jobs";
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { practicePayload } from "@/lib/practice";

/** Today's daily review (prepared overnight by Inngest, or generated now). Returns saved answers so it can resume. */
export async function POST() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json(practicePayload(await ensureDailySet(user.id)));
  } catch (err) {
    return errorResponse(err);
  }
}
