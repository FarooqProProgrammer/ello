import { config } from "dotenv";
import type { NextConfig } from "next";

// Single .env at the monorepo root.
config({ path: "../../.env", quiet: true });

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/activities", "@repo/ai", "@repo/config", "@repo/core", "@repo/db", "@repo/jobs", "@repo/ui", "@repo/voice"],
  serverExternalPackages: ["pg", "web-push"],
};

export default nextConfig;
