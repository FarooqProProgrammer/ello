import { saveEnrichedVocab } from "@repo/db";
import { getCurrentUser } from "@/lib/current-user";
import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, parseBody } from "@/lib/api";

const bodySchema = z.object({
  source: z.string().max(40).default("pack"),
  items: z
    .array(
      z.object({
        term: z.string().min(1).max(80),
        definition: z.string().min(1).max(400),
        translation: z.string().max(200).default(""),
        example: z.string().max(400).default(""),
        usageNote: z.string().max(600).default(""),
        partOfSpeech: z.string().max(40).default(""),
      }),
    )
    .min(1)
    .max(20),
});

/** Saves ready-made dictionary entries (e.g. an idioms pack) without another AI call. */
export async function POST(req: Request) {
  try {
    const { items, source } = await parseBody(req, bodySchema);
    const user = await getCurrentUser();
    const saved = [];
    for (const item of items) {
      const { item: row } = await saveEnrichedVocab(user.id, { ...item, usageNative: "" }, source);
      saved.push({ id: row.id, term: row.term });
    }
    return NextResponse.json({ saved });
  } catch (err) {
    return errorResponse(err);
  }
}
