import { resolveMistakes } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, HttpError, parseBody } from "@/lib/api";

const bodySchema = z.object({ id: z.string().optional(), category: z.string().max(80).optional() });

/** "Mark as learned" for one mistake or a whole category. */
export async function POST(req: Request) {
  try {
    const target = await parseBody(req, bodySchema);
    if (!target.id && !target.category) throw new HttpError(400, "Choose a mistake or a category.");
    const user = await getCurrentUser();
    return NextResponse.json({ resolved: await resolveMistakes(user.id, target) });
  } catch (err) {
    return errorResponse(err);
  }
}
