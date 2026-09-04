import prisma from "../lib/prisma";

export interface ReportSearchOptions {
  search?: string;
  status?: "DRAFT" | "SUBMITTED" | "APPROVED" | "PAID";
  ownerId?: string;
  approverId?: string;
  sortBy?: "submittedAt" | "status" | "total";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

/**
 * Get all submitted, non-archived reports.
 */
export async function getSubmittedReports() {
  return prisma.expenseReport.findMany({
    where: {
      status: "SUBMITTED",
      archived: false,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      expenseLines: true,
      approvers: {
        include: {
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      submittedAt: "asc",
    },
  });
}

/**
 * Assign an approver to a submitted report.
 */
export async function assignApprover(
  reportId: string,
  approverId: string
) {
  const report = await prisma.expenseReport.findUnique({
    where: {
      id: reportId,
    },
  });

  if (!report) {
    throw new Error("Expense report not found");
  }

  if (report.status !== "SUBMITTED") {
    throw new Error(
      "Only submitted reports can be assigned"
    );
  }

  const approver = await prisma.user.findUnique({
    where: {
      id: approverId,
    },
  });

  if (!approver || approver.role !== "APPROVER") {
    throw new Error("Invalid approver");
  }

  const existing = await prisma.reportApprover.findUnique({
    where: {
      reportId_approverId: {
        reportId,
        approverId,
      },
    },
  });

  if (existing) {
    throw new Error("Approver is already assigned to this report");
  }

  return prisma.reportApprover.create({
    data: {
      reportId,
      approverId,
    },
  });
}

/**
 * Approve a submitted report.
 *
 * Server-side rules:
 * - Report must exist.
 * - Report must be SUBMITTED.
 * - Approver must be assigned to the report.
 * - Approver cannot approve their own report.
 * - Status transition is SUBMITTED -> APPROVED.
 * - History entry is immutable.
 */
export async function approveReport(
  reportId: string,
  approverId: string
) {
  const report = await prisma.expenseReport.findUnique({
    where: {
      id: reportId,
    },
    include: {
      approvers: true,
    },
  });

  if (!report) {
    throw new Error("Expense report not found");
  }

  if (report.ownerId === approverId) {
    throw new Error(
      "The approver cannot approve/reject their own report"
    );
  }

  if (report.status !== "SUBMITTED") {
    throw new Error(
      "Only submitted reports can be approved"
    );
  }

  const assigned = report.approvers.some(
    (assignment) =>
      assignment.approverId === approverId
  );

  if (!assigned) {
    throw new Error(
      "You are not assigned to this report"
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.expenseReport.update({
      where: {
        id: reportId,
      },
      data: {
        status: "APPROVED",
      },
    });

    await tx.reportHistory.create({
      data: {
        reportId,
        actorId: approverId,
        oldStatus: "SUBMITTED",
        newStatus: "APPROVED",
        reason: "Report approved by approver",
      },
    });

    return updated;
  });
}

/**
 * Reject a submitted report.
 *
 * Status transition:
 * SUBMITTED -> DRAFT
 */
export async function rejectReport(
  reportId: string,
  approverId: string,
  reason: string
) {
  const report = await prisma.expenseReport.findUnique({
    where: {
      id: reportId,
    },
    include: {
      approvers: true,
    },
  });

  if (!report) {
    throw new Error("Expense report not found");
  }

  if (report.ownerId === approverId) {
    throw new Error(
      "The approver cannot approve/reject their own report"
    );
  }

  if (report.status !== "SUBMITTED") {
    throw new Error(
      "Only submitted reports can be rejected"
    );
  }

  const assigned = report.approvers.some(
    (assignment) =>
      assignment.approverId === approverId
  );

  if (!assigned) {
    throw new Error(
      "You are not assigned to this report"
    );
  }

  if (!reason || !reason.trim()) {
    throw new Error(
      "Rejection reason is required"
    );
  }

  const cleanReason = reason.trim();

  return prisma.$transaction(async (tx) => {
    const updated = await tx.expenseReport.update({
      where: {
        id: reportId,
      },
      data: {
        status: "DRAFT",
      },
    });

    await tx.reportHistory.create({
      data: {
        reportId,
        actorId: approverId,
        oldStatus: "SUBMITTED",
        newStatus: "DRAFT",
        reason: `Report rejected: ${cleanReason}`,
      },
    });

    return updated;
  });
}

/**
 * Mark an approved report as paid.
 *
 * Status transition:
 * APPROVED -> PAID
 */
export async function markReportAsPaid(
  reportId: string,
  approverId: string
) {
  const report = await prisma.expenseReport.findUnique({
    where: {
      id: reportId,
    },
  });

  if (!report) {
    throw new Error("Expense report not found");
  }

  if (report.status !== "APPROVED") {
    throw new Error(
      "Only approved reports can be marked as paid"
    );
  }

  const approver = await prisma.user.findUnique({
    where: {
      id: approverId,
    },
  });

  if (!approver || approver.role !== "APPROVER") {
    throw new Error(
      "Only approvers can mark reports as paid"
    );
  }

  return prisma.$transaction(async (tx) => {
    const updatedReport =
      await tx.expenseReport.update({
        where: {
          id: reportId,
        },
        data: {
          status: "PAID",
        },
      });

    await tx.reportHistory.create({
      data: {
        reportId,
        oldStatus: "APPROVED",
        newStatus: "PAID",
        actorId: approverId,
      },
    });

    return updatedReport;
  });
}

/**
 * Get submitted reports assigned to a specific approver.
 */
export async function getAssignedSubmittedReports(
  approverId: string
) {
  return prisma.expenseReport.findMany({
    where: {
      status: "SUBMITTED",
      archived: false,
      approvers: {
        some: {
          approverId,
        },
      },
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      expenseLines: true,
      approvers: {
        include: {
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      submittedAt: "asc",
    },
  });
}

/**
 * Search and paginate reports.
 */
export async function searchReports(
  options: ReportSearchOptions
) {
  const {
    search,
    status,
    ownerId,
    approverId,
    sortBy = "submittedAt",
    sortOrder = "desc",
    page = 1,
    pageSize = 10,
  } = options;

  const safePage = Math.max(1, page);
  const safePageSize = Math.min(
    100,
    Math.max(1, pageSize)
  );

  const where: any = {
    archived: false,
  };

  if (search?.trim()) {
    const term = search.trim();
    where.OR = [
      {
        title: {
          contains: term,
          mode: "insensitive",
        },
      },
      {
        owner: {
          name: {
            contains: term,
            mode: "insensitive",
          },
        },
      },
      {
        owner: {
          email: {
            contains: term,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (ownerId) {
    where.ownerId = ownerId;
  }

  if (approverId) {
    where.approvers = {
      some: {
        approverId,
      },
    };
  }

  const skip =
    (safePage - 1) * safePageSize;

  const orderBy: any = {
    [sortBy]: sortOrder,
  };

  const [reports, total] =
    await prisma.$transaction([
      prisma.expenseReport.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          expenseLines: true,
          approvers: {
            include: {
              approver: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy,
        skip,
        take: safePageSize,
      }),

      prisma.expenseReport.count({
        where,
      }),
    ]);

  return {
    reports,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.ceil(
        total / safePageSize
      ),
    },
  };
}

/**
 * Bulk approve/reject reports.
 *
 * Each report is processed independently so that
 * one failure does not prevent the remaining reports
 * from being processed.
 */
export async function bulkUpdateReports(
  reportIds: string[],
  approverId: string,
  action: "APPROVE" | "REJECT",
  reason?: string
) {
  const results = [];

  if (
    action === "REJECT" &&
    (!reason || !reason.trim())
  ) {
    throw new Error(
      "Rejection reason is required"
    );
  }

  for (const reportId of reportIds) {
    try {
      if (action === "APPROVE") {
        const report = await approveReport(
          reportId,
          approverId
        );

        results.push({
          reportId,
          success: true,
          status: "APPROVED",
          report,
        });
      } else {
        const report = await rejectReport(
          reportId,
          approverId,
          reason!.trim()
        );

        results.push({
          reportId,
          success: true,
          status: "DRAFT",
          report,
        });
      }
    } catch (error) {
      const reportInfo = await prisma.expenseReport.findUnique({
        where: { id: reportId },
        include: {
          owner: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      results.push({
        reportId,
        title: reportInfo?.title || "",
        owner: reportInfo?.owner || null,
        success: false,
        reason:
          error instanceof Error
            ? error.message
            : "Failed to update report",
      });
    }
  }

  return results;
}

/**
 * Get approved reports waiting for payment.
 */
export async function getApprovedReportsForPayment() {
  return prisma.expenseReport.findMany({
    where: {
      status: "APPROVED",
      archived: false,
    },
    include: {
      owner: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      submittedAt: "asc",
    },
  });
}