import { createScenario } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { errorResponse, parseBody } from "@/lib/api";
import { scenarioSchema } from "./schema";

export async function POST(req: Request) {
  try {
    const input = await parseBody(req, scenarioSchema);
    const user = await getCurrentUser();
    return NextResponse.json(await createScenario(user.id, input));
  } catch (err) {
    return errorResponse(err);
  }
}
