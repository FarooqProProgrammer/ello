import { TUTOR_TOPICS } from "@repo/activities";
import { createSession, getScenario } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, HttpError, parseBody } from "@/lib/api";

const bodySchema = z.object({ topicId: z.string(), focus: z.string().max(80).nullish() });

export async function POST(req: Request) {
  try {
    const { topicId, focus } = await parseBody(req, bodySchema);
    const user = await getCurrentUser();

    if (topicId.startsWith("custom:")) {
      const scenario = await getScenario(user.id, topicId.slice("custom:".length));
      if (!scenario) throw new HttpError(404, "Scenario not found.");
      // Snapshot the scenario so later edits or deletion don't change this chat.
      const session = await createSession(user.id, "tutor-chat", scenario.title, {
        topicId,
        focus: focus ?? null,
        data: { scenario: { title: scenario.title, description: scenario.description } },
      });
      return NextResponse.json({ id: session.id });
    }

    const topic = TUTOR_TOPICS.find((t) => t.id === topicId) ?? TUTOR_TOPICS[0];
    const session = await createSession(user.id, "tutor-chat", topic.label, { topicId: topic.id, focus: focus ?? null });
    return NextResponse.json({ id: session.id });
  } catch (err) {
    return errorResponse(err);
  }
}
