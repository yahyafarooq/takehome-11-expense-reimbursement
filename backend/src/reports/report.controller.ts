import prisma from "../lib/prisma";
import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { createReportSchema } from "../validators/report.validator";
import {
  createReport,
  submitReport,
  updateReport,
  archiveReport,
  restoreReport,
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

    const archivedReports =
      await prisma.expenseReport.findMany({
        where: {
          ownerId: req.user.userId,
          archived: true,
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
      archivedReports,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch reports",
    });
  }
}

export async function getReportById(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const report = await prisma.expenseReport.findUnique({
      where: { id: req.params.reportId as string },
      include: {
        expenseLines: true,
        owner: { select: { id: true, name: true, email: true } },
        approvers: {
          include: {
            approver: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // IDOR check: employees can only see their own reports
    if (req.user.role === "EMPLOYEE" && report.ownerId !== req.user.userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.status(200).json({ report });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch report" });
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
      req.params.reportId as string,
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

export async function updateExpenseReport(
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

    const report = await updateReport(
      req.params.reportId as string,
      req.user.userId,
      result.data.title,
      result.data.startDate,
      result.data.endDate
    );

    return res.status(200).json({
      message: "Expense report updated successfully",
      report,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update report";

    return res.status(400).json({ message });
  }
}

export async function archiveExpenseReport(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const report = await archiveReport(
      req.params.reportId as string,
      req.user.userId
    );

    return res.status(200).json({
      message: "Report archived successfully",
      report,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to archive report";

    return res.status(400).json({ message });
  }
}

export async function restoreExpenseReport(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const report = await restoreReport(
      req.params.reportId as string,
      req.user.userId
    );

    return res.status(200).json({
      message: "Report restored successfully",
      report,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to restore report";

    return res.status(400).json({ message });
  }
}