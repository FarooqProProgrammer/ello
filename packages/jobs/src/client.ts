import { Inngest } from "inngest";

/**
 * Inngest client. Locally set INNGEST_DEV=1 so events go to the dev server (http://localhost:8288),
 * started with `pnpm --filter @repo/jobs dev` (included in `pnpm dev`).
 */
export const inngest = new Inngest({ id: "eng-learn" });
