import { MEMORY_FACT_MAX_LENGTH } from "@repo/core";
import { addMemories, clearMemories, memoriesByMessage } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, HttpError, parseBody } from "@/lib/api";

const factSchema = z.object({
  fact: z.string().trim().min(3, "Write a few words").max(MEMORY_FACT_MAX_LENGTH, `Keep it under ${MEMORY_FACT_MAX_LENGTH} characters`),
});

/** Facts learned from one chat message: GET /api/memory?messageId=… (used for the "Remembered" chip). */
export async function GET(req: Request) {
  try {
    const messageId = new URL(req.url).searchParams.get("messageId");
    if (!messageId) throw new HttpError(400, "messageId is required.");
    const user = await getCurrentUser();
    const map = await memoriesByMessage(user.id, { messageId });
    return NextResponse.json({ facts: map.get(messageId) ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Add a fact manually. */
export async function POST(req: Request) {
  try {
    const { fact } = await parseBody(req, factSchema);
    const user = await getCurrentUser();
    const [saved] = await addMemories(user.id, [fact], "manual");
    if (!saved) throw new HttpError(409, "That's already in memory.");
    return NextResponse.json(saved);
  } catch (err) {
    return errorResponse(err);
  }
}

/** Forget everything. */
export async function DELETE() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ deleted: await clearMemories(user.id) });
  } catch (err) {
    return errorResponse(err);
  }
}
