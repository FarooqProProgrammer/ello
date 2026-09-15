import { getCurrentUser } from "@/lib/current-user";
import { pushConfigured, sendPushToUser } from "@repo/jobs";
import { NextResponse } from "next/server";
import { errorResponse, HttpError } from "@/lib/api";

/** Sends a test reminder to all of the learner's subscribed devices. */
export async function POST() {
  try {
    if (!pushConfigured()) throw new HttpError(400, "Push isn't set up: run `pnpm vapid` and restart the dev server.", "push_not_configured");
    const user = await getCurrentUser();
    const sent = await sendPushToUser(user.id, { title: "Ello reminders are on ✅", body: "This is what your daily reminder will look like.", url: "/daily" });
    if (!sent) throw new HttpError(404, "No subscribed device found. Turn reminders off and on again in this browser.");
    return NextResponse.json({ sent });
  } catch (err) {
    return errorResponse(err);
  }
}
