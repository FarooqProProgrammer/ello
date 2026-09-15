import { getPracticeSession } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { errorResponse, HttpError } from "@/lib/api";
import { practicePayload } from "@/lib/practice";

/** Loads (or resumes) an existing practice session's questions. */
export async function POST(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    const user = await getCurrentUser();
    const session = await getPracticeSession(user.id, sessionId);
    if (!session?.data) throw new HttpError(404, "Practice session not found.");
    return NextResponse.json(practicePayload(session));
  } catch (err) {
    return errorResponse(err);
  }
}
