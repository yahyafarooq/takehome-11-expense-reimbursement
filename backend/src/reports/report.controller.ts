import prisma from "../lib/prisma";
import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createReportSchema } from "../validators/report.validator";
import {
  createReport,
  submitReport,
} from "./report.service";

export async function createExpenseReport(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const result = createReportSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const report = await createReport(req.user.userId, result.data);

    return res.status(201).json({
      message: "Expense report created successfully",
      report,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create report";

    return res.status(400).json({
      message,
    });
  }
}

export async function getMyReports(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const reports = await prisma.expenseReport.findMany({
      where: {
        ownerId: req.user.userId,
        archived: false,
      },
      include: {
        expenseLines: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      reports,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch reports",
    });
  }
}

export async function submitExpenseReport(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const report = await submitReport(
      req.params.reportId,
      req.user.userId
    );

    return res.status(200).json({
      message: "Expense report submitted successfully",
      report,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to submit report";

    return res.status(400).json({
      message,
    });
  }
}