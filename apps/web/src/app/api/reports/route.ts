import { getCurrentUser } from "@/lib/current-user";
import { generateWeeklyReport } from "@repo/jobs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, parseBody } from "@/lib/api";

const bodySchema = z.object({ force: z.boolean().default(false) });

/** Generates this week's progress report now (normally written by the Sunday Inngest job). */
export async function POST(req: Request) {
  try {
    const { force } = await parseBody(req, bodySchema);
    const user = await getCurrentUser();
    const session = await generateWeeklyReport(user.id, { force });
    return NextResponse.json({ id: session.id });
  } catch (err) {
    return errorResponse(err);
  }
}
