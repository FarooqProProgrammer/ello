import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// The .env file lives at the monorepo root.
config({ path: "../../.env", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx src/seed.ts",
  },
  datasource: {
    // `prisma generate` doesn't connect, so allow it to run without a configured database (e.g. CI).
    url: process.env.DATABASE_URL ?? "postgresql://unset:unset@localhost:5432/unset",
  },
});
