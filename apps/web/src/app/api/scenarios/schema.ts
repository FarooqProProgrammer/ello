import { z } from "zod";

export const scenarioSchema = z.object({
  title: z.string().trim().min(3, "Title needs at least 3 characters").max(60, "Title can be at most 60 characters"),
  description: z
    .string()
    .trim()
    .min(15, "Describe the scenario in at least 15 characters")
    .max(1500, "Description can be at most 1500 characters"),
});
