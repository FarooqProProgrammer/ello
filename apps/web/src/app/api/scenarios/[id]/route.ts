import { deleteScenario, updateScenario } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { errorResponse, HttpError, parseBody } from "@/lib/api";
import { scenarioSchema } from "../schema";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const input = await parseBody(req, scenarioSchema);
    const user = await getCurrentUser();
    if (!(await updateScenario(user.id, id, input))) throw new HttpError(404, "Scenario not found.");
    return NextResponse.json({ id, ...input });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!(await deleteScenario(user.id, id))) throw new HttpError(404, "Scenario not found.");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
