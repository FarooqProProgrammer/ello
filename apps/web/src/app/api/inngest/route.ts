import { inngest } from "@repo/jobs";
import { functions } from "@repo/jobs/functions";
import { serve } from "inngest/next";

/** Inngest calls this endpoint to run background functions (local dev server: http://localhost:8288). */
export const { GET, POST, PUT } = serve({ client: inngest, functions });
