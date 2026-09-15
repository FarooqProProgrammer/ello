import { deleteVocab } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { errorResponse, HttpError } from "@/lib/api";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!(await deleteVocab(user.id, id))) throw new HttpError(404, "Word not found.");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
