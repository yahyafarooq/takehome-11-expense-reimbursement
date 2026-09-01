import { z } from "zod";

export const createReportSchema = z.object({
  title: z.string().min(1, "Title is required"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;