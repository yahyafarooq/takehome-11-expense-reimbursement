import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  getSubmittedReports,
  assignApprover,
  approveReport,
  rejectReport,
} from "./approval.service";

export async function listSubmittedReports(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const reports = await getSubmittedReports();

    return res.status(200).json({
      reports,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch submitted reports",
    });
  }
}

export async function assignReportApprover(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { approverId } = req.body;

    if (!approverId) {
      return res.status(400).json({
        message: "approverId is required",
      });
    }

    const assignment = await assignApprover(
      req.params.reportId,
      approverId
    );

    return res.status(201).json({
      message: "Approver assigned successfully",
      assignment,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to assign approver";

    return res.status(400).json({
      message,
    });
  }
}

export async function approveExpenseReport(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const report = await approveReport(
      req.params.reportId,
      req.user.userId
    );

    return res.status(200).json({
      message: "Expense report approved successfully",
      report,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to approve report";

    return res.status(400).json({
      message,
    });
  }
}

export async function rejectExpenseReport(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { reason } = req.body;

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({
        message: "Rejection reason is required",
      });
    }

    const report = await rejectReport(
      req.params.reportId,
      req.user.userId,
      reason
    );

    return res.status(200).json({
      message: "Expense report rejected successfully",
      report,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to reject report";

    return res.status(400).json({
      message,
    });
  }
}