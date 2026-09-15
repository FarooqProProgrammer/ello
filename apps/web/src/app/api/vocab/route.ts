import { addVocab } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { emit, EVENTS } from "@repo/jobs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, parseBody } from "@/lib/api";

const bodySchema = z.object({
  term: z.string().min(1).max(80),
  definition: z.string().min(1).max(300),
  example: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  try {
    const input = await parseBody(req, bodySchema);
    const user = await getCurrentUser();
    const item = await addVocab(user.id, input);
    await emit(EVENTS.vocabAdded, { userId: user.id, terms: [item.term] });
    return NextResponse.json({ id: item.id });
  } catch (err) {
    return errorResponse(err);
  }
}
