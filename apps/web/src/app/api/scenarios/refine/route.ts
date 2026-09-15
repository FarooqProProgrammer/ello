import { refinedScenarioSchema, refineScenarioRequest, SCENARIO_FIELDS } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { getLearnerContext } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse, HttpError, parseBody } from "@/lib/api";

const bodySchema = z.object({
  title: z.string().max(200),
  description: z.string().max(3000),
  field: z.enum(SCENARIO_FIELDS),
});

/** AI rewrite of a scenario's title or description (nothing is saved). */
export async function POST(req: Request) {
  try {
    const input = await parseBody(req, bodySchema);
    if (input.title.trim().length < 3 && input.description.trim().length < 3) {
      throw new HttpError(400, "Write a few words in the title or description first.");
    }
    const user = await getCurrentUser();
    const [ctx, env] = await Promise.all([getLearnerContext(user.id), aiEnvFor(user.id)]);

    const refined = await getProvider("generator", env).structured(refineScenarioRequest(ctx, input), refinedScenarioSchema, "scenario");
    const clean = (s: string) => s.trim().replace(/^["“']+|["”']+$/g, "");
    return NextResponse.json({
      title: clean(refined.title).slice(0, 60),
      description: clean(refined.description).slice(0, 1500),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
