import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { authEnabled, getAuth } from "@/lib/auth";

const disabled = () => NextResponse.json({ error: "Accounts are not enabled. Set BETTER_AUTH_SECRET to turn them on." }, { status: 404 });

export async function GET(req: Request) {
  return authEnabled() ? toNextJsHandler(getAuth()).GET(req) : disabled();
}

export async function POST(req: Request) {
  return authEnabled() ? toNextJsHandler(getAuth()).POST(req) : disabled();
}
