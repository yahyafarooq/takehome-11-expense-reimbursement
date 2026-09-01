import { z } from "zod";

export const createExpenseLineSchema = z.object({
  expenseDate: z.string().datetime(),
  amount: z.number().positive("Amount must be greater than 0"),
  category: z.enum([
    "TRAVEL",
    "MEALS",
    "HOTEL",
    "SUPPLIES",
    "OTHER",
  ]),
  description: z.string().min(1, "Description is required"),
});

export type CreateExpenseLineInput = z.infer<
  typeof createExpenseLineSchema
>;