import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createExpenseLineSchema } from "../validators/expense.validator";
import { createExpenseLine } from "./expense.service";

export async function addExpenseLine(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const result = createExpenseLineSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const expense = await createExpenseLine(
      req.params.reportId,
      result.data
    );

    return res.status(201).json({
      message: "Expense added successfully",
      expense,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add expense";

    return res.status(400).json({
      message,
    });
  }
}