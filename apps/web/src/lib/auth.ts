import { db, onUserCreated } from "@repo/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

/** Accounts are on when BETTER_AUTH_SECRET is set; otherwise the app runs in single-user mode. */
export function authEnabled(): boolean {
  return Boolean(process.env.BETTER_AUTH_SECRET);
}

export function googleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function createAuth() {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    database: prismaAdapter(db(), { provider: "postgresql" }),
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    socialProviders: googleEnabled()
      ? { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! } }
      : {},
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "user", input: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await onUserCreated(user.id, user.email, adminEmails);
          },
        },
      },
    },
    plugins: [nextCookies()], // must stay last
  });
}

let instance: ReturnType<typeof createAuth> | null = null;

/** Lazily created so builds and single-user mode never need the auth database tables. */
export function getAuth() {
  instance ??= createAuth();
  return instance;
}
