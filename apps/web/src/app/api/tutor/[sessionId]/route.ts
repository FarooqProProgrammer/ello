import { deleteSession, renameSession } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, HttpError, parseBody } from "@/lib/api";

type Ctx = { params: Promise<{ sessionId: string }> };

const renameSchema = z.object({ title: z.string().trim().min(1, "Title can't be empty").max(80) });

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { sessionId } = await params;
    const { title } = await parseBody(req, renameSchema);
    const user = await getCurrentUser();
    if (!(await renameSession(user.id, sessionId, title))) throw new HttpError(404, "Chat not found.");
    return NextResponse.json({ ok: true, title });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { sessionId } = await params;
    const user = await getCurrentUser();
    if (!(await deleteSession(user.id, sessionId))) throw new HttpError(404, "Chat not found.");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
