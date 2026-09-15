import { REVIEW_RATINGS } from "@repo/core";
import { applyReview } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, parseBody } from "@/lib/api";

const bodySchema = z.object({ rating: z.enum(REVIEW_RATINGS) });

export async function POST(req: Request, { params }: { params: Promise<{ vocabId: string }> }) {
  try {
    const { vocabId } = await params;
    const { rating } = await parseBody(req, bodySchema);
    const user = await getCurrentUser();
    const item = await applyReview(user.id, vocabId, rating);
    return NextResponse.json({ due: item.due.toISOString() });
  } catch (err) {
    return errorResponse(err);
  }
}
