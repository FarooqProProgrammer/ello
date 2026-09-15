import { deletePushSubscription, savePushSubscription } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, parseBody } from "@/lib/api";

const subscriptionSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

/** Stores this browser's push subscription for reminders. */
export async function POST(req: Request) {
  try {
    const sub = await parseBody(req, subscriptionSchema);
    const user = await getCurrentUser();
    await savePushSubscription(user.id, { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const { endpoint } = await parseBody(req, z.object({ endpoint: z.url() }));
    await deletePushSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
