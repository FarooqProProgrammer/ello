import { ieltsTaskRequest, ieltsTaskSchema } from "@repo/activities";
import { getProvider } from "@repo/ai";
import { getLearnerContext } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { aiEnvFor } from "@/lib/ai-env";
import { errorResponse } from "@/lib/api";

/** A fresh IELTS Writing Task 2 question. */
export async function POST() {
  try {
    const user = await getCurrentUser();
    const [ctx, env] = await Promise.all([getLearnerContext(user.id), aiEnvFor(user.id)]);
    const { question } = await getProvider("generator", env).structured(ieltsTaskRequest(ctx), ieltsTaskSchema, "ielts_task");
    return NextResponse.json({ question: question.trim() });
  } catch (err) {
    return errorResponse(err);
  }
}
