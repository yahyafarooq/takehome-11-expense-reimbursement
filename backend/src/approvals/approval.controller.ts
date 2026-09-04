import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  getSubmittedReports,
  getAssignedSubmittedReports,
  searchReports,
  assignApprover,
  approveReport,
  rejectReport,
  markReportAsPaid,
  bulkUpdateReports,
  getApprovedReportsForPayment,
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

export async function searchExpenseReports(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const {
      search,
      status,
      ownerId,
      approverId,
      sortBy,
      sortOrder,
      page,
      pageSize,
    } = req.query;

    const result = await searchReports({
      ...(search ? { search: String(search) } : {}),
      ...(status
        ? {
            status: String(status) as
              | "DRAFT"
              | "SUBMITTED"
              | "APPROVED"
              | "PAID",
          }
        : {}),
      ...(ownerId ? { ownerId: String(ownerId) } : {}),
      ...(approverId ? { approverId: String(approverId) } : {}),
      ...(sortBy
        ? {
            sortBy: String(sortBy) as
              | "submittedAt"
              | "status"
              | "total",
          }
        : {}),
      ...(sortOrder
        ? {
            sortOrder: String(sortOrder) as "asc" | "desc",
          }
        : {}),
      ...(page ? { page: Number(page) } : {}),
      ...(pageSize ? { pageSize: Number(pageSize) } : {}),
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to search expense reports",
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
      req.params.reportId as string,
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
      req.params.reportId as string,
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
      req.params.reportId as string,
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

export async function markReportPaid(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const reportId = req.params.reportId as string;
    const approverId = req.user.userId;

    const report = await markReportAsPaid(
      reportId,
      approverId
    );

    return res.status(200).json({
      message: "Report marked as paid",
      report,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to mark report as paid",
    });
  }
}

export async function listAssignedSubmittedReports(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const approverId = req.user.userId;

    const reports =
      await getAssignedSubmittedReports(approverId);

    return res.status(200).json({
      reports,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch assigned reports",
    });
  }
}

export async function bulkUpdateExpenseReports(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const { reportIds, action, reason } = req.body;

    if (!Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({
        message: "reportIds must be a non-empty array",
      });
    }

    if (action !== "APPROVE" && action !== "REJECT") {
      return res.status(400).json({
        message: "action must be APPROVE or REJECT",
      });
    }

    if (
      action === "REJECT" &&
      (!reason || typeof reason !== "string" || !reason.trim())
    ) {
      return res.status(400).json({
        message: "Rejection reason is required",
      });
    }

    const results = await bulkUpdateReports(
      reportIds,
      req.user.userId,
      action,
      reason
    );

    return res.status(200).json({
      results,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to process bulk action",
    });
  }
}

export async function exportApprovedReportsCsv(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const reports = await getApprovedReportsForPayment();

    const header = [
      "Report ID",
      "Title",
      "Owner Name",
      "Owner Email",
      "Total",
      "Submitted At",
      "Status",
    ];

    const rows = reports.map((report) => [
      report.id,
      report.title,
      report.owner.name,
      report.owner.email,
      report.total.toString(),
      report.submittedAt?.toISOString() ?? "",
      report.status,
    ]);

    const escapeCsv = (value: string) =>
      `"${value.replace(/"/g, '""')}"`;

    const csv = [
      header.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=approved-reports.csv"
    );

    return res.status(200).send(csv);
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to export approved reports",
    });
  }
}