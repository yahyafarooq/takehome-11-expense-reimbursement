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

const VALID_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "PAID",
] as const;

const VALID_SORT_FIELDS = [
  "submittedAt",
  "status",
  "total",
] as const;

const VALID_SORT_ORDERS = [
  "asc",
  "desc",
] as const;

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
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch submitted reports",
    });
  }
}

export async function searchExpenseReports(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    /*
     * This endpoint is protected by the APPROVER role
     * middleware in approval.routes.ts.
     *
     * Do not rely on the frontend to restrict access.
     */
    if (req.user.role !== "APPROVER") {
      return res.status(403).json({
        message:
          "Only approvers can search all expense reports",
      });
    }

    const {
      search,
      title,
      status,
      ownerId,
      approverId,
      sortBy,
      sortOrder,
      page,
      pageSize,
    } = req.query;

    if (
      status &&
      !VALID_STATUSES.includes(
        String(status) as (typeof VALID_STATUSES)[number]
      )
    ) {
      return res.status(400).json({
        message: "Invalid report status",
      });
    }

    if (
      sortBy &&
      !VALID_SORT_FIELDS.includes(
        String(sortBy) as (typeof VALID_SORT_FIELDS)[number]
      )
    ) {
      return res.status(400).json({
        message: "Invalid sort field",
      });
    }

    if (
      sortOrder &&
      !VALID_SORT_ORDERS.includes(
        String(sortOrder) as (typeof VALID_SORT_ORDERS)[number]
      )
    ) {
      return res.status(400).json({
        message: "Invalid sort order",
      });
    }

    let parsedPage = 1;
    let parsedPageSize = 10;

    if (page !== undefined) {
      parsedPage = Number(page);

      if (
        !Number.isInteger(parsedPage) ||
        parsedPage < 1
      ) {
        return res.status(400).json({
          message:
            "page must be a positive integer",
        });
      }
    }

    if (pageSize !== undefined) {
      parsedPageSize = Number(pageSize);

      if (
        !Number.isInteger(parsedPageSize) ||
        parsedPageSize < 1 ||
        parsedPageSize > 100
      ) {
        return res.status(400).json({
          message:
            "pageSize must be an integer between 1 and 100",
        });
      }
    }

    const searchTerm = search || title;

    const result = await searchReports({
      ...(searchTerm
        ? {
            search: String(searchTerm),
          }
        : {}),

      ...(status
        ? {
            status: String(status) as
              | "DRAFT"
              | "SUBMITTED"
              | "APPROVED"
              | "PAID",
          }
        : {}),

      ...(ownerId
        ? {
            ownerId: String(ownerId),
          }
        : {}),

      ...(approverId
        ? {
            approverId: String(approverId),
          }
        : {}),

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
            sortOrder: String(sortOrder) as
              | "asc"
              | "desc",
          }
        : {}),

      page: parsedPage,
      pageSize: parsedPageSize,
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

    if (
      !approverId ||
      typeof approverId !== "string"
    ) {
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
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to assign approver",
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
      message:
        "Expense report approved successfully",
      report,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to approve report",
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

    if (
      typeof reason !== "string" ||
      !reason.trim()
    ) {
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
      message:
        "Expense report rejected successfully",
      report,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "Failed to reject report",
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

    const report = await markReportAsPaid(
      req.params.reportId as string,
      req.user.userId
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

    const reports =
      await getAssignedSubmittedReports(
        req.user.userId
      );

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

    const { reportIds, action, reason } =
      req.body;

    if (
      !Array.isArray(reportIds) ||
      reportIds.length === 0
    ) {
      return res.status(400).json({
        message:
          "reportIds must be a non-empty array",
      });
    }

    if (
      reportIds.some(
        (id) => typeof id !== "string" || !id.trim()
      )
    ) {
      return res.status(400).json({
        message:
          "reportIds must contain valid report IDs",
      });
    }

    if (
      action !== "APPROVE" &&
      action !== "REJECT"
    ) {
      return res.status(400).json({
        message:
          "action must be APPROVE or REJECT",
      });
    }

    if (
      action === "REJECT" &&
      (typeof reason !== "string" ||
        !reason.trim())
    ) {
      return res.status(400).json({
        message:
          "Rejection reason is required",
      });
    }

    const results =
      await bulkUpdateReports(
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

    const reports =
      await getApprovedReportsForPayment();

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
      ...rows.map((row) =>
        row.map(escapeCsv).join(",")
      ),
    ].join("\n");

    res.setHeader(
      "Content-Type",
      "text/csv; charset=utf-8"
    );

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