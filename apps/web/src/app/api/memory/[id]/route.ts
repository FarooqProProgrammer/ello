import { MEMORY_FACT_MAX_LENGTH } from "@repo/core";
import { deleteMemory, updateMemory } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, HttpError, parseBody } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

const factSchema = z.object({
  fact: z.string().trim().min(3, "Write a few words").max(MEMORY_FACT_MAX_LENGTH, `Keep it under ${MEMORY_FACT_MAX_LENGTH} characters`),
});

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const { fact } = await parseBody(req, factSchema);
    const user = await getCurrentUser();
    if (!(await updateMemory(user.id, id, fact))) throw new HttpError(404, "Memory not found.");
    return NextResponse.json({ id, fact });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!(await deleteMemory(user.id, id))) throw new HttpError(404, "Memory not found.");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
