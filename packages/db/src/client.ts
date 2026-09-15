import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

// In dev the instance lives on globalThis to survive hot reloads. We also remember which generated
// PrismaClient class created it, so a regenerated client (after a schema change) replaces the stale one.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaClass?: typeof PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and run `pnpm db:up`.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/** Lazily created so importing the package never throws at build time. */
export function db(): PrismaClient {
  if (!globalForPrisma.prisma || globalForPrisma.prismaClass !== PrismaClient) {
    void globalForPrisma.prisma?.$disconnect();
    globalForPrisma.prisma = createClient();
    globalForPrisma.prismaClass = PrismaClient;
  }
  return globalForPrisma.prisma;
}
