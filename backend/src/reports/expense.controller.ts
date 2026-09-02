import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createExpenseLineSchema } from "../validators/expense.validator";
import {
  createExpenseLine,
  updateExpenseLine,
  deleteExpenseLine,
} from "./expense.service";

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
      req.params.reportId as string,
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

export async function editExpenseLine(
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

    const expense = await updateExpenseLine(
      req.params.reportId as string,
      req.params.expenseId as string,
      req.user.userId,
      result.data
    );

    return res.status(200).json({
      message: "Expense updated successfully",
      expense,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to update expense",
    });
  }
}

export async function removeExpenseLine(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    await deleteExpenseLine(
      req.params.reportId as string,
      req.params.expenseId as string,
      req.user.userId
    );

    return res.status(200).json({
      message: "Expense deleted successfully",
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to delete expense",
    });
  }
}