import { db, getCurrentUser as getSingleUser } from "@repo/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { HttpError } from "./api";
import { authEnabled, getAuth } from "./auth";

/** The signed-in learner (or the single local learner when accounts are off). Cached per request. */
const loadUser = cache(async () => {
  if (!authEnabled()) return getSingleUser();
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  return db().user.findUnique({ where: { id: session.user.id } });
});

export type AppUser = NonNullable<Awaited<ReturnType<typeof loadUser>>>;

/** For API routes: responds 401 when not signed in. */
export async function getCurrentUser(): Promise<AppUser> {
  const user = await loadUser();
  if (!user) throw new HttpError(401, "Please sign in to continue.", "unauthorized");
  return user;
}

/** For pages and layouts: redirects to sign-in when not signed in. */
export async function requirePageUser(): Promise<AppUser> {
  const user = await loadUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** Single-user mode is run by its owner, so admin pages are open there. */
export function isAdmin(user: { role: string }): boolean {
  return !authEnabled() || user.role === "admin";
}
